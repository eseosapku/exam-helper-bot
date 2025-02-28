# scraper.py
import requests
from bs4 import BeautifulSoup
import os
import pdfplumber
import re
from pymongo import MongoClient
import json

class ExamPaperScraper:
    def __init__(self, db_connection_string):
        self.client = MongoClient(db_connection_string)
        self.db = self.client['exam_papers']
        self.papers_collection = self.db['papers']
        self.marking_schemes_collection = self.db['marking_schemes']
        
    def scrape_website(self, url, site_type):
        """Scrape exam paper website and download PDFs"""
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # This will vary based on the website structure
        pdf_links = soup.find_all('a', href=re.compile(r'\.pdf$'))
        
        for link in pdf_links:
            pdf_url = link['href']
            if not pdf_url.startswith('http'):
                pdf_url = url + pdf_url
                
            file_name = os.path.basename(pdf_url)
            self.download_pdf(pdf_url, file_name)
            
            # Process the PDF
            if 'mark' in file_name.lower() or 'scheme' in file_name.lower():
                self.process_marking_scheme(file_name)
            else:
                self.process_exam_paper(file_name)
                
    def download_pdf(self, url, file_name):
        """Download PDF file from URL"""
        response = requests.get(url)
        os.makedirs('downloads', exist_ok=True)
        with open(f'downloads/{file_name}', 'wb') as f:
            f.write(response.content)
        print(f"Downloaded {file_name}")
        
    def process_exam_paper(self, file_name):
        """Extract questions from exam paper PDF"""
        questions = []
        
        with pdfplumber.open(f'downloads/{file_name}') as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
                
            # Simple pattern matching to identify questions
            # This will need refinement based on actual PDF structure
            question_blocks = re.split(r'\n\d+\.', text)
            
            for i, block in enumerate(question_blocks[1:], 1):
                questions.append({
                    "number": i,
                    "text": block.strip(),
                    "paper_id": file_name,
                    "subject": self._extract_subject(file_name),
                    "year": self._extract_year(file_name)
                })
                
        # Store in database
        for question in questions:
            self.papers_collection.update_one(
                {"paper_id": question["paper_id"], "number": question["number"]},
                {"$set": question},
                upsert=True
            )
            
    def process_marking_scheme(self, file_name):
        """Extract answers from marking scheme PDF"""
        answers = []
        
        with pdfplumber.open(f'downloads/{file_name}') as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
                
            # This pattern matching will need to be customized
            answer_blocks = re.split(r'\n\d+\.', text)
            
            for i, block in enumerate(answer_blocks[1:], 1):
                answers.append({
                    "number": i,
                    "text": block.strip(),
                    "scheme_id": file_name,
                    "subject": self._extract_subject(file_name),
                    "year": self._extract_year(file_name)
                })
                
        # Store in database
        for answer in answers:
            self.marking_schemes_collection.update_one(
                {"scheme_id": answer["scheme_id"], "number": answer["number"]},
                {"$set": answer},
                upsert=True
            )
    
    def _extract_subject(self, file_name):
        """Extract subject from filename"""
        # Customize this based on your file naming conventions
        subjects = ["math", "physics", "chemistry", "biology", "english"]
        for subject in subjects:
            if subject in file_name.lower():
                return subject
        return "unknown"
        
    def _extract_year(self, file_name):
        """Extract year from filename"""
        # Look for 4-digit year in filename
        match = re.search(r'20\d{2}', file_name)
        if match:
            return match.group(0)
        return "unknown"