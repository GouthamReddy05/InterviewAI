import io
from PyPDF2 import PdfReader
import docx
import os

def extract_text_from_file(file_source):
    """
    Supports:
    - FastAPI UploadFile
    - File-like object
    - File path (str)
    """

    text = ""

    # --- Case 1: FastAPI UploadFile ---
    if hasattr(file_source, "file") and hasattr(file_source, "filename"):
        filename = file_source.filename
        content_stream = io.BytesIO(file_source.file.read())
        file_source.file.seek(0)

    # --- Case 2: File-like object ---
    elif hasattr(file_source, "read"):
        filename = getattr(file_source, "filename", "")
        content_stream = io.BytesIO(file_source.read())
        file_source.seek(0)

    # --- Case 3: File path ---
    elif isinstance(file_source, str):
        if not os.path.exists(file_source):
            raise FileNotFoundError(f"No such file: '{file_source}'")
        filename = file_source
        content_stream = file_source

    else:
        raise TypeError("Invalid file source provided.")

    # --- Handle PDF ---
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(content_stream)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    # --- Handle DOCX ---
    elif filename.lower().endswith(".docx"):
        document = docx.Document(content_stream)
        for para in document.paragraphs:
            text += para.text + "\n"

    else:
        raise ValueError("Unsupported file type. Please upload PDF or DOCX.")

    return text