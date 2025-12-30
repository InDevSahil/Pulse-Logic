import time
import numpy as np
import threading
import random

class PulseSimulator:
    def __init__(self):
        self.running = False
        self.bpm = 75  # Beats per minute
        self.condition = "Normal"
        self.variability = 0.05
        self.current_phase = 0.0
        self.sample_rate = 100
        self.amplitude = 1.0
        # Extra Metrics
        self.spo2 = 98.0
        self.systolic = 120
        self.diastolic = 80
        # Scenario Logic
        self.scenario_active = False
        self.scenario_start_time = 0
        self._lock = threading.Lock()
        
    def set_condition(self, condition):
        with self._lock:
            self.condition = condition
            if condition == "Normal":
                self.bpm = 75
                self.variability = 0.05
                self.spo2 = 98 + random.uniform(-1, 1)
                self.systolic = 120
                self.diastolic = 80
            elif condition == "Tachycardia":
                self.bpm = 130
                self.variability = 0.02
                self.spo2 = 95 + random.uniform(-1, 1)
                self.systolic = 140
                self.diastolic = 90
            elif condition == "Bradycardia":
                self.bpm = 45
                self.variability = 0.1
                self.spo2 = 96 + random.uniform(-2, 1)
                self.systolic = 100
                self.diastolic = 60
            elif condition == "Arrhythmia":
                self.bpm = 80
                self.variability = 0.4
                self.spo2 = 93 + random.uniform(-2, 2)
                self.systolic = 110 + random.randint(-10, 10)
                self.diastolic = 70 + random.randint(-10, 10)

    def start_scenario(self):
        self.scenario_active = True
        self.scenario_start_time = time.time()
        threading.Thread(target=self._run_scenario, daemon=True).start()

    def _run_scenario(self):
        # Script: Normal -> Tachycardia -> Arrhythmia -> Crisis -> Recovery
        scenarios = [
            ("Normal", 5),
            ("Tachycardia", 5),
            ("Arrhythmia", 8),
            ("Bradycardia", 5),
            ("Normal", 10)
        ]
        
        for cond, duration in scenarios:
            if not self.scenario_active: break
            self.set_condition(cond)
            time.sleep(duration)
        
        self.scenario_active = False

    def stop_scenario(self):
        self.scenario_active = False
        self.set_condition("Normal")

    def get_state(self):
        with self._lock:
            return {
                "bpm": self.bpm,
                "condition": self.condition,
                "variability": self.variability
            }

    def generate_ppg_wave(self, t):
        """
        Generates a synthetic PPG waveform at time t.
        Uses a sum of two Gaussian functions to approximate the systolic and diastolic peaks.
        """
        cycle_duration = 60.0 / self.bpm if self.bpm > 0 else 1.0
        
        # Add variability (jitter) to the cycle length effectively
        # For a simple continuous stream, we map time to phase
        
        phase = (t % cycle_duration) / cycle_duration
        
        # Systolic peak
        p1 = self.amplitude * np.exp(-((phase - 0.2) ** 2) / (2 * 0.05 ** 2))
        
        # Diastolic peak (dicrotic notch)
        p2 = (self.amplitude * 0.5) * np.exp(-((phase - 0.5) ** 2) / (2 * 0.08 ** 2))
        
        noise = np.random.normal(0, 0.02)
        
        return p1 + p2 + noise

    def stream_data(self):
        """
        Generator that yields data points.
        """
        t = 0.0
        dt = 1.0 / self.sample_rate
        
        while True:
            # Simulate arrhythmia by dynamically adjusting BPM slightly per beat or interval
            # But for simple streaming, we just use the current params
             
            if self.condition == "Arrhythmia":
                 # Randomly skip a beat or change speed momentarily?
                 # ideally implemented by changing cycle_duration per beat
                 pass 

            value = self.generate_ppg_wave(t)
            
            # Drift metrics slightly
            current_spo2 = self.spo2 + random.uniform(-0.1, 0.1)
            
            yield {
                "timestamp": time.time(),
                "value": value,
                "bpm": self.bpm,
                "condition": self.condition,
                "spo2": round(current_spo2, 1),
                "bp": f"{int(self.systolic)}/{int(self.diastolic)}"
            }
            time.sleep(dt)
            t += dt

# Singleton instance
simulator = PulseSimulator()
