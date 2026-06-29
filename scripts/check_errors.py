#!/usr/bin/env python3
import os
import subprocess
import traceback

def check_python_syntax(root_dir):
    errors = []
    py_files = []
    
    # Recursively find all python files in the root_dir
    for dirpath, _, filenames in os.walk(root_dir):
        # Exclude common non-source directories
        if any(ignored in dirpath for ignored in ['.venv', 'venv', '__pycache__', '.git']):
            continue
        for filename in filenames:
            if filename.endswith('.py'):
                py_files.append(os.path.join(dirpath, filename))
                
    for filepath in py_files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            # Compile file to check for syntax errors
            compile(content, filepath, 'exec')
        except SyntaxError as e:
            errors.append({
                'file': filepath,
                'line': e.lineno,
                'offset': e.offset,
                'text': e.text.strip() if e.text else '',
                'msg': e.msg
            })
        except Exception as e:
            errors.append({
                'file': filepath,
                'line': 0,
                'offset': 0,
                'text': '',
                'msg': f"Unexpected error during compilation: {str(e)}"
            })
            
    return errors, len(py_files)

def check_typescript_errors(frontend_dir):
    errors = []
    
    # Run npx tsc --noEmit in the frontend directory
    try:
        # Use shell=True for running npm/npx on Windows/Linux environments cleanly
        result = subprocess.run(
            'npx tsc --noEmit',
            shell=True,
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout_lines = result.stdout.splitlines()
        for line in stdout_lines:
            # Typical tsc output format:
            # src/components/Topbar.tsx(13,50): error TS2339: Property 'displayName' does not exist on type 'User'.
            if 'error TS' in line:
                parts = line.split(': error TS')
                if len(parts) >= 2:
                    file_and_pos = parts[0].strip()
                    err_msg = 'TS' + parts[1].strip()
                    
                    # Try parsing filename, line, column
                    file_path = file_and_pos
                    line_num = '?'
                    col_num = '?'
                    if '(' in file_and_pos and ')' in file_and_pos:
                        f_part, pos_part = file_and_pos.split('(', 1)
                        file_path = f_part.strip()
                        pos_part = pos_part.replace(')', '').strip()
                        if ',' in pos_part:
                            line_num, col_num = pos_part.split(',', 1)
                        else:
                            line_num = pos_part
                    
                    errors.append({
                        'file': os.path.join(frontend_dir, file_path),
                        'line': line_num,
                        'column': col_num,
                        'msg': err_msg
                    })
    except Exception as e:
        errors.append({
            'file': frontend_dir,
            'line': '0',
            'column': '0',
            'msg': f"Failed to run tsc command: {str(e)}"
        })
        
    return errors

def main():
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    backend_dir = os.path.join(workspace_root, 'backend')
    frontend_dir = os.path.join(workspace_root, 'frontend')
    docs_dir = os.path.join(workspace_root, 'docs')
    
    os.makedirs(docs_dir, exist_ok=True)
    log_path = os.path.join(docs_dir, 'error_log.txt')
    
    print("Starting diagnostic scan...")
    print(f"Scanning Python backend: {backend_dir}")
    py_errors, total_py_files = check_python_syntax(backend_dir)
    print(f"Found {len(py_errors)} syntax errors in {total_py_files} Python files.")
    
    print(f"Running TypeScript type check in frontend: {frontend_dir}")
    ts_errors = check_typescript_errors(frontend_dir)
    print(f"Found {len(ts_errors)} TypeScript errors.")
    
    # Write to error_log.txt
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write("======================================================================\n")
        f.write("                  STUDLYF V2 ERROR DIAGNOSTIC LOG                     \n")
        f.write("======================================================================\n\n")
        
        f.write(f"Total Python Files Scanned: {total_py_files}\n")
        f.write(f"Total Python Syntax Errors: {len(py_errors)}\n")
        f.write(f"Total TypeScript Compiler Errors: {len(ts_errors)}\n\n")
        
        f.write("----------------------------------------------------------------------\n")
        f.write("1. PYTHON SYNTAX ERRORS\n")
        f.write("----------------------------------------------------------------------\n")
        if py_errors:
            for idx, err in enumerate(py_errors, 1):
                f.write(f"[{idx}] FILE: {err['file']}\n")
                f.write(f"    LINE: {err['line']}\n")
                f.write(f"    ERROR: {err['msg']}\n")
                if err['text']:
                    f.write(f"    CODE: {err['text']}\n")
                f.write("\n")
        else:
            f.write("No Python syntax errors found!\n\n")
            
        f.write("----------------------------------------------------------------------\n")
        f.write("2. TYPESCRIPT COMPILER ERRORS\n")
        f.write("----------------------------------------------------------------------\n")
        if ts_errors:
            for idx, err in enumerate(ts_errors, 1):
                f.write(f"[{idx}] FILE: {err['file']}\n")
                f.write(f"    LINE: {err['line']}, COL: {err['column']}\n")
                f.write(f"    ERROR: {err['msg']}\n\n")
        else:
            f.write("No TypeScript compiler errors found!\n\n")
            
    print(f"Diagnostics complete. Error log written to: {log_path}")

if __name__ == '__main__':
    main()
