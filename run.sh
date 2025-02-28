# run.sh
#!/bin/bash

# Start backend
cd backend
python app.py &
python whatsapp_bot.py &

# Start frontend
cd ../frontend
npm start
