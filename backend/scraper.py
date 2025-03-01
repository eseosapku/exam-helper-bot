import requests
import pdfplumber
import re
import os
from pymongo import MongoClient
import logging

class ExamPaperScraper:
    def __init__(self, db_connection_string):
        self.client = MongoClient(db_connection_string)
        self.db = self.client['exam_papers']
        self.papers_collection = self.db['papers']
        self.marking_schemes_collection = self.db['marking_schemes']
        logging.basicConfig(level=logging.INFO)

    def scrape_website(self, url, site_type):
        """Scrape exam paper website and download PDFs"""
        try:
            response = requests.get(url)
            response.raise_for_status()  # This raises an error for non-2xx status codes
            soup = BeautifulSoup(response.text, 'html.parser')
            pdf_links = soup.find_all('a', href=re.compile(r'\.pdf$'))

            for link in pdf_links:
                pdf_url = link['href']
                if not pdf_url.startswith('http'):
                    pdf_url = url + pdf_url
                file_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', os.path.basename(pdf_url))

                self.download_pdf(pdf_url, file_name)
                self.process_pdf(file_name, is_marking_scheme='mark' in file_name.lower())

        except requests.exceptions.RequestException as e:
            logging.error(f"Error scraping {url}: {e}")

    def download_pdf(self, url, file_name):
        """Download PDF file from URL"""
        try:
            response = requests.get(url)
            os.makedirs('downloads', exist_ok=True)
            with open(f'downloads/{file_name}', 'wb') as f:
                f.write(response.content)
            logging.info(f"Downloaded {file_name}")
        except Exception as e:
            logging.error(f"Error downloading {url}: {e}")

    def process_pdf(self, file_name, is_marking_scheme=False):
        """Process the PDF (either exam paper or marking scheme)"""
        items = []
        with pdfplumber.open(f'downloads/{file_name}') as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()

            blocks = re.split(r'\n\d+\.', text)
            for i, block in enumerate(blocks[1:], 1):
                items.append({
                    "number": i,
                    "text": block.strip(),
                    "file_name": file_name,
                    "subject": self._extract_subject(file_name),
                    "year": self._extract_year(file_name),
                    "type": "marking_scheme" if is_marking_scheme else "exam_paper"
                })
        
        self.bulk_insert(self.marking_schemes_collection if is_marking_scheme else self.papers_collection, items)

    def _extract_subject(self, file_name):
        subjects = ["math", "physics", "chemistry", "biology", "english"]
        for subject in subjects:
            if subject in file_name.lower():
                return subject
        return "unknown"

    def _extract_year(self, file_name):
        match = re.search(r'20\d{2}', file_name)
        return match.group(0) if match else "unknown"

    def bulk_insert(self, collection, items):
        """Bulk insert documents into the collection"""
        bulk_operations = []
        for item in items:
            bulk_operations.append(
                pymongo.UpdateOne(
                    {"file_name": item["file_name"], "number": item["number"]},
                    {"$set": item},
                    upsert=True
                )
            )
        collection.bulk_write(bulk_operations)
