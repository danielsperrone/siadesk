"""Extrai texto por página e renderiza páginas do PDF de exemplo como PNG."""
import sys
import pdfplumber
import pypdfium2 as pdfium

PDF = r"C:\Users\danie\OneDrive\Documentos\Empresa\Dimensionador\docs\exemplo-desenho-tecnico.pdf"
OUT = r"C:\Users\danie\OneDrive\Documentos\Empresa\Dimensionador\docs\paginas"

import os
os.makedirs(OUT, exist_ok=True)

with pdfplumber.open(PDF) as pdf:
    print(f"Total de paginas: {len(pdf.pages)}")
    for i, page in enumerate(pdf.pages, 1):
        text = (page.extract_text() or "").strip()
        print(f"\n===== PAGINA {i} ({page.width:.0f}x{page.height:.0f}pt) =====")
        print(text[:1200] if text else "(sem texto extraivel)")

doc = pdfium.PdfDocument(PDF)
for i in range(len(doc)):
    page = doc[i]
    bitmap = page.render(scale=1.2)
    img = bitmap.to_pil()
    img.save(os.path.join(OUT, f"pagina-{i+1:02d}.png"))
print("\nPNGs salvos em", OUT)
