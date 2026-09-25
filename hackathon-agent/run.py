"""
run.py - The full ANO (Autonomous Neural Optimizer) demo.
Step 1: Run the Worker (some tasks will fail)
Step 2: Run the Overmind (it finds failures in SigNoz and diagnoses them)

Usage:
    python run.py              # Run full demo (5 worker tasks + 2 overmind cycles)
    python run.py worker 10    # Run worker with 10 tasks
    python run.py overmind 5   # Run overmind with 5 cycles
"""
import sys
import subprocess
import time
import os

def get_python_exe():
    try:
        subprocess.run([sys.executable, "-c", "import langchain_core, clickhouse_connect"], check=True, capture_output=True)
        return sys.executable
    except Exception:
        miniconda_py = r"C:\users\sonis\miniconda3\python.exe"
        if os.path.exists(miniconda_py):
            return miniconda_py
        return sys.executable

PYTHON = get_python_exe()


def run_worker(num_tasks: int = 5):
    print("\n" + "=" * 60)
    print("  PHASE 1: WORKER AGENT")
    print("  Running tasks")
    print("=" * 60)
    subprocess.run([PYTHON, "worker.py", str(num_tasks)], cwd=os.path.dirname(__file__) or ".", check=True)


def run_overmind(num_cycles: int = 2):
    print("\n" + "=" * 60)
    print("  PHASE 2: OVERMIND AGENT")
    print("  Scanning SigNoz for failures and diagnosing...")
    print("=" * 60)
    subprocess.run([PYTHON, "overmind.py", str(num_cycles)], cwd=os.path.dirname(__file__) or ".", check=True)


def main():
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        if mode == "worker":
            run_worker(count)
        elif mode == "overmind":
            run_overmind(count)
        else:
            print(f"Unknown mode: {mode}. Use 'worker' or 'overmind'.")
    else:
        # Full demo
        run_worker(5)
        print("\n[run] Waiting 5s for traces to flush to SigNoz...")
        time.sleep(5)
        run_overmind(2)
        print("\n" + "=" * 60)
        print("  DEMO COMPLETE")
        print("  Open SigNoz at http://localhost:3301 to see:")
        print("  - 'hackathon-ai-worker' service traces")
        print("  - 'hackathon-ai-overmind' service traces")
        print("=" * 60)


if __name__ == "__main__":
    main()
