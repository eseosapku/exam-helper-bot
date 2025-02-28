# qa_system.py
from transformers import pipeline
from pymongo import MongoClient
import re

class QuestionAnswering:
    def __init__(self, db_connection_string):
        self.client = MongoClient(db_connection_string)
        self.db = self.client['exam_papers']
        self.papers_collection = self.db['papers']
        self.marking_schemes_collection = self.db['marking_schemes']
        
        # Load NLP model for question answering
        self.qa_pipeline = pipeline("question-answering")
        
    def search_question(self, query):
        """Search for a question similar to the query"""
        # This is a simple keyword search
        # For production, consider using a vector database or similar
        keywords = re.findall(r'\w+', query.lower())
        matches = []
        
        for keyword in keywords:
            if len(keyword) > 3:  # Skip short words
                found = self.papers_collection.find(
                    {"text": {"$regex": keyword, "$options": "i"}},
                    {"_id": 0, "number": 1, "text": 1, "paper_id": 1, "subject": 1, "year": 1}
                )
                matches.extend(list(found))
                
        # Remove duplicates and sort by relevance
        unique_matches = {}
        for match in matches:
            if match["paper_id"] not in unique_matches:
                unique_matches[match["paper_id"]] = match
                
        return list(unique_matches.values())
        
    def get_answer(self, paper_id, question_number):
        """Get the answer for a specific question"""
        paper = self.papers_collection.find_one({
            "paper_id": paper_id, 
            "number": int(question_number)
        })
        
        if not paper:
            return "Question not found"
        
        # Find corresponding marking scheme
        subject = paper["subject"]
        year = paper["year"]
        
        marking_scheme = self.marking_schemes_collection.find_one({
            "subject": subject,
            "year": year,
            "number": int(question_number)
        })
        
        if marking_scheme:
            return marking_scheme["text"]
        
        # If no marking scheme found, try to generate an answer
        return self._generate_answer(paper["text"])
        
    def _generate_answer(self, question_text):
        """Generate an answer using AI if no marking scheme is available"""
        # This would normally use a more sophisticated model
        # For now, we'll return a placeholder
        return "I don't have the official answer for this question yet."
        
    def ask_custom_question(self, user_question, context=None):
        """Answer a custom question about exam content"""
        if not context:
            # Find relevant content to use as context
            matches = self.search_question(user_question)
            if not matches:
                return "I couldn't find any relevant exam content to answer your question."
            
            # Use the most relevant match as context
            context = matches[0]["text"]
            
        # Use QA pipeline to generate answer
        result = self.qa_pipeline(question=user_question, context=context)
        return result["answer"]