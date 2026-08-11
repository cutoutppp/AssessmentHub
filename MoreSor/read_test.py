import PyPDF2
import sys

def read_pdf(file_path):
    with open(file_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for i in range(min(2, len(reader.pages))):
            text += reader.pages[i].extract_text() + '\n'
        return text

with open('output.txt', 'w', encoding='utf-8') as f:
    f.write("--- mpdf.pdf ---\n")
    f.write(read_pdf('mpdf.pdf'))
    f.write("\n--- mpdf2.pdf ---\n")
    f.write(read_pdf('mpdf2.pdf'))
