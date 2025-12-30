import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("Warning: GEMINI_API_KEY not found in environment.")

model = genai.GenerativeModel('gemini-2.0-flash')

def analyze_pulse_snapshot(bpm, condition, variability, recent_values=None):
    """
    Sends pulse metrics to Gemini for a "Hardware read" analysis.
    """
    if not API_KEY:
        return "AI Module Offline: No API Key configured."

    prompt = f"""
    You are the AI engine of an advanced Assisted Pulse Reading Hardware.
    Analyze the following live sensor data:
    - Heart Rate: {bpm} BPM
    - Detected Condition Pattern: {condition}
    - Variability Index: {variability}
    
    Provide a concise, medical-techno sounding analysis. 
    1. Assess the urgency.
    2. Suggest immediate actions or potential causes.
    3. Keep it under 50 words.
    
    Output format: Plain text.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"AI Analysis Error: {str(e)}"

def generate_health_report(simulation_session_data):
    """
    Generates a full report based on a longer session.
    """
    if not API_KEY:
        return "AI Module Offline."

    prompt = f"""
    Generate a detailed clinical report for a Pulse Simulation Session.
    Session Summary: {json.dumps(simulation_session_data)}
    
    Include:
    - Patient Status Assessment
    - Anomalies Detected
    - Recommended Follow-up
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating report: {str(e)}"
