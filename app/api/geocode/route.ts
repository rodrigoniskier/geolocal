import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

type LocalRow = {
  Local: string
}

type ResultRow = {
  nome: string
  endereco: string
  lat: string
  lon: string
}

async function geocodeOne(nome: string): Promise<ResultRow> {
  // ajuste aqui para diferenciar João Pessoa / Cabedelo se quiser
  const q = encodeURIComponent(`${nome}, Paraíba, Brasil`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1`

  const res = await fetch(url, {
    headers: {
      // policy do Nominatim exige User-Agent identificando o app + contato.[web:58][web:61][web:63]
      'User-Agent': 'internato-med-geocoder/1.0 (contato: seu-email@exemplo.com)'
    }
  })

  if (!res.ok) {
    return { nome, endereco: '', lat: '', lon: '' }
  }

  const data = (await res.json()) as any[]

  if (!data || data.length === 0) {
    return { nome, endereco: '', lat: '', lon: '' }
  }

  const item = data[0]

  return {
    nome,
    endereco: item.display_name ?? '',
    lat: item.lat ?? '',
    lon: item.lon ?? ''
  }
}

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'locais.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf8')

    const parsed = Papa.parse<LocalRow>(fileContent, {
      header: true,
      skipEmptyLines: true
    })

    const locais = parsed.data
      .map((row) => row.Local?.trim())
      .filter((v): v is string => !!v)

    const results: ResultRow[] = []

    for (const nome of locais) {
      // pequeno delay para não bombardear o Nominatim (1 req/s recomendado).[web:38][web:54][web:61]
      await new Promise((r) => setTimeout(r, 1100))
      const rrow = await geocodeOne(nome)
      results.push(rrow)
    }

    const linhas = [
      'Nome do Local;Endereço Completo;Latitude;Longitude',
      ...results.map((r) => {
        const enderecoSan = r.endereco.replace(/;/g, ',')
        return `${r.nome};${enderecoSan};${r.lat};${r.lon}`
      })
    ]

    const csvOut = linhas.join('
')

    return new NextResponse(csvOut, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="locais_geocodificados.csv"'
      }
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Erro ao processar CSV', details: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
