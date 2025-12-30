from flask import Flask, render_template, Response, request, jsonify
import pulse_logic
import gemini_service
import json
import time

app = Flask(__name__)
simulator = pulse_logic.simulator

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stream')
def stream():
    def event_stream():
        print("Client connected to stream")
        data_gen = simulator.stream_data()
        for data in data_gen:
            json_data = json.dumps(data)
            # print(f"Yielding: {json_data[:50]}...") # Verbose debug
            yield f"data: {json_data}\n\n"
            # Control stream rate slightly to match sample rate if needed, 
            # but simulator.stream_data already sleeps.
    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/api/condition', methods=['POST'])
def set_condition():
    data = request.json
    condition = data.get('condition', 'Normal')
    simulator.set_condition(condition)
    return jsonify({"status": "updated", "condition": condition})

@app.route('/api/scenario', methods=['POST'])
def toggle_scenario():
    data = request.json
    action = data.get('action')
    if action == 'start':
        simulator.start_scenario()
        return jsonify({"status": "started", "message": "Pulse Scenario Active"})
    else:
        simulator.stop_scenario()
        return jsonify({"status": "stopped", "message": "Pulse Scenario Stopped"})

@app.route('/api/analyze', methods=['GET'])
def analyze():
    state = simulator.get_state()
    # Call Gemini
    insight = gemini_service.analyze_pulse_snapshot(
        state['bpm'], 
        state['condition'], 
        state['variability']
    )
    return jsonify({"insight": insight})

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
