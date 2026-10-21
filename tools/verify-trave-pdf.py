"""Verifica o PDF produzido por smoke-trave-pdf.mjs, inclusive imagens 3D."""
import json
import sys
from pathlib import Path

import pymupdf

path = Path(sys.argv[1])
pdf = pymupdf.open(path)
pages = []
for name, height, width, reference, offsets in [
    ('Trave entrada', '6,50 m', '4,80 m', 'Cabeceira A (entrada)', ['0,70 m', '0,90 m']),
    ('Trave meio', '7,20 m', '6,00 m', 'Meio da balança', ['1,10 m', '1,70 m']),
]:
    matches = [(n, page) for n, page in enumerate(pdf) if f'DETALHAMENTO TÉCNICO - {name.upper()}' in page.get_text()]
    assert len(matches) == 1, f'Esperada uma página individual para {name}, encontradas {len(matches)}'
    n, page = matches[0]
    text = page.get_text()
    for value in [height, width, reference, *offsets, 'Cotas entre eixos', 'Afastamento da coluna Z-:', 'Afastamento da coluna Z+:']:
        assert value in text, f'{name}: especificação ausente: {value}'
    if name == 'Trave entrada':
        for value in ['Ponto de montagem:', 'Barra superior - Z = 0,40 m', 'Barra superior - Z = -0,60 m', 'Coluna lateral Z+']:
            assert value in text, f'Montagem ausente: {value}'
    else:
        assert 'Nenhum equipamento adicional instalado nesta estrutura.' in text
    images = page.get_images()
    assert len(images) == 1, f'{name}: desenho 3D ausente ou duplicado'
    image = pymupdf.Pixmap(pdf, images[0][0])
    assert image.width >= 200 and image.height >= 200, 'Imagem 3D sem resolução'
    colored = sum(1 for sample in image.samples[::image.n] if sample < 230)
    assert colored > 100, f'{name}: desenho 3D vazio'
    assert abs(page.rect.width - 1190.55) < 2 and abs(page.rect.height - 841.89) < 2, 'Página fora do formato A3 paisagem'
    pages.append({'name': name, 'page': n + 1, 'imageSize': [image.width, image.height], 'coloredPixels': colored})
assert any('DETALHAMENTO TÉCNICO - POSTE SIAP01' in page.get_text() for page in pdf), 'Detalhe do poste padrão ausente'
report = {'pdf': str(path.resolve()), 'pages': len(pdf), 'traves': pages, 'status': 'passed'}
path.with_suffix('.verified.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
