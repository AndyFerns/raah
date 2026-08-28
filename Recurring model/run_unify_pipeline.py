import subprocess
import os
import sys

def main():
    env = os.environ.copy()
    env["OPENBLAS_NUM_THREADS"] = "1"
    env["OMP_NUM_THREADS"] = "1"
    
    python_exe = sys.executable
    
    scripts = [
        "unify.build_unified_base",
        "unify.feature_engineering_unified",
        "unify.validate",
        "unify.leakage_audit"
    ]
    
    for script in scripts:
        print(f"--- Running {script} ---")
        result = subprocess.run([python_exe, "-m", script], env=env)
        if result.returncode != 0:
            print(f"Error running {script}. Exiting.")
            sys.exit(result.returncode)
            
    print("Pipeline completed successfully!")

if __name__ == "__main__":
    main()
