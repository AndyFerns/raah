"""Run the full Teacher-Student ML pipeline sequentially."""
import subprocess
import sys
import os

def main():
    env = os.environ.copy()
    env["OPENBLAS_NUM_THREADS"] = "1"
    env["OMP_NUM_THREADS"] = "1"
    
    python_exe = sys.executable
    
    steps = [
        ("Step 1: Train Teacher", "ml_pipeline.train_teacher"),
        ("Step 2: Generate Pseudo-Labels", "ml_pipeline.generate_pseudo_labels"),
        ("Step 3: Train Student", "ml_pipeline.train_student"),
    ]
    
    for name, module in steps:
        print(f"\n{'='*60}")
        print(f"  {name}")
        print(f"{'='*60}")
        result = subprocess.run([python_exe, "-m", module], env=env)
        if result.returncode != 0:
            print(f"FAILED at: {name}")
            sys.exit(result.returncode)
    
    print(f"\n{'='*60}")
    print("  Pipeline completed successfully!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
