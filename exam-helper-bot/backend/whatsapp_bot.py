# whatsapp_bot.py (continued)

@app.route('/whatsapp', methods=['POST'])
def whatsapp_webhook():
    # Get incoming message
    incoming_msg = request.values.get('Body', '').strip()
    sender = request.values.get('From', '')
    
    # Create response
    resp = MessagingResponse()
    msg = resp.message()
    
    # Check if user is registered and has active subscription
    user = db.users.find_one({"phone": sender})
    
    if not user:
        msg.body("You're not registered with Exam Helper. Please visit our website to create an account and link your WhatsApp number.")
        return str(resp)
    
    if user.get("subscription_status") != "active":
        msg.body("Your subscription is not active. Please visit our website to subscribe to Exam Helper.")
        return str(resp)
    
    # Process commands
    if incoming_msg.lower().startswith('find:'):
        # Search for exam questions
        query = incoming_msg[5:].strip()
        matches = qa_system.search_question(query)
        
        if matches:
            response_text = "I found these similar questions:\n\n"
            for i, match in enumerate(matches[:3], 1):  # Limit to 3 for readability
                response_text += f"{i}. {match['subject']} ({match['year']}) - Question {match['number']}\n"
                response_text += f"{match['text'][:100]}...\n\n"
            
            response_text += "Reply with 'answer:1' to get the answer for the first question (or 2, 3 for others)."
            msg.body(response_text)
        else:
            msg.body("I couldn't find any similar questions. Try rephrasing your search.")
    
    elif incoming_msg.lower().startswith('answer:'):
        try:
            # Get answer for a specific question from previous search
            index = int(incoming_msg[7:].strip()) - 1
            
            # Get the user's search history
            search_history = db.search_history.find_one({"user_id": user["_id"]})
            
            if not search_history or not search_history.get("matches") or index >= len(search_history["matches"]):
                msg.body("I don't have that question in your recent searches. Please search for questions first.")
                return str(resp)
            
            match = search_history["matches"][index]
            answer = qa_system.get_answer(match["paper_id"], match["number"])
            
            msg.body(f"Answer for Question {match['number']}:\n\n{answer}")
        except (ValueError, IndexError):
            msg.body("Invalid command. Please reply with 'answer:1' to get the answer for the first question.")
    
    elif incoming_msg.lower().startswith('pdf:'):
        try:
            # Send PDF of a specific paper
            index = int(incoming_msg[4:].strip()) - 1
            
            # Get the user's search history
            search_history = db.search_history.find_one({"user_id": user["_id"]})
            
            if not search_history or not search_history.get("matches") or index >= len(search_history["matches"]):
                msg.body("I don't have that paper in your recent searches. Please search for questions first.")
                return str(resp)
            
            match = search_history["matches"][index]
            paper_url = f"{request.host_url}api/download/{match['paper_id']}"
            
            # You can't directly send a PDF over WhatsApp via Twilio
            # but you can send a link to download it
            msg.body(f"You can download the paper here: {paper_url}")
        except (ValueError, IndexError):
            msg.body("Invalid command. Please reply with 'pdf:1' to get the link for the first paper.")
    
    elif incoming_msg.lower() == 'help':
        help_text = """Exam Helper Commands:
        
- find:your_question - Search for relevant exam questions
- answer:n - Get the answer for the nth question in your last search
- pdf:n - Get a download link for the nth paper in your last search
- help - Show this help message

Visit our website for more features!"""
        msg.body(help_text)
    
    else:
        # Try to answer as a custom question
        answer = qa_system.ask_custom_question(incoming_msg)
        msg.body(f"Here's what I think:\n\n{answer}\n\nType 'help' to see available commands.")
    
    # Save the user's search history if this was a search
    if incoming_msg.lower().startswith('find:'):
        db.search_history.update_one(
            {"user_id": user["_id"]},
            {"$set": {"matches": matches}},
            upsert=True
        )
    
    return str(resp)

if __name__ == '__main__':
    app.run(debug=True, port=5001)