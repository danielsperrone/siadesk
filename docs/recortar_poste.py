import os
import pypdfium2 as pdfium
from PIL import Image

pdf_path = r"C:\Users\danie\OneDrive\Documentos\Empresa\SIADESK\docs\exemplo-desenho-tecnico.pdf"
public_dir = r"C:\Users\danie\OneDrive\Documentos\Empresa\SIADESK\public"

# Carrega o PDF
doc = pdfium.PdfDocument(pdf_path)
# Página 3 (índice 2)
page = doc[2]

# Renderiza em alta resolução
scale = 4.0
bitmap = page.render(scale=scale)
img = bitmap.to_pil()

width, height = img.size
print(f"Resolução da imagem renderizada (escala {scale}): {width}x{height}")

# Define as coordenadas de corte baseadas no layout da folha A3 original
# O tubo fica no lado esquerdo
box_tubo = (
    int(width * 0.05), 
    int(height * 0.04), 
    int(width * 0.22), 
    int(height * 0.90)
)

# O Detalhe A (fixação) fica no centro superior
box_detalhe_a = (
    int(width * 0.27), 
    int(height * 0.05), 
    int(width * 0.55), 
    int(height * 0.44)
)

# A Sapata (vista superior) fica no centro inferior
box_sapata = (
    int(width * 0.27), 
    int(height * 0.45), 
    int(width * 0.55), 
    int(height * 0.94)
)

# Corta as imagens
img_tubo = img.crop(box_tubo)
img_detalhe_a = img.crop(box_detalhe_a)
img_sapata = img.crop(box_sapata)

# Salva na pasta public
img_tubo.save(os.path.join(public_dir, "poste_tubo.png"), "PNG")
img_detalhe_a.save(os.path.join(public_dir, "poste_detalhe_a.png"), "PNG")
img_sapata.save(os.path.join(public_dir, "poste_sapata.png"), "PNG")

print("Imagens recortadas e salvas com sucesso em public/ !")
