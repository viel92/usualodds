#!/usr/bin/env python3
"""
Diagnostic approfondi des problèmes de connexion Supabase
Analyse: DNS, réseau, certificats, pagination, timeouts
"""

import os
import sys
import time
import socket
import requests
import ssl
import urllib3
from urllib.parse import urlparse

def test_dns_resolution():
    """Test résolution DNS"""
    print("DNS RESOLUTION TEST")
    print("=" * 20)
    
    hostname = "bpyftqmkqwtmhqvuqctf.supabase.co"
    
    try:
        # Test résolution DNS
        ip_address = socket.gethostbyname(hostname)
        print(f"[OK] DNS Resolution: {hostname} -> {ip_address}")
        
        # Test multiple DNS servers
        import dns.resolver
        print("[INFO] Testing multiple DNS servers...")
        
        for dns_server in ['8.8.8.8', '1.1.1.1', '208.67.222.222']:
            try:
                resolver = dns.resolver.Resolver()
                resolver.nameservers = [dns_server]
                result = resolver.resolve(hostname, 'A')
                print(f"  DNS {dns_server}: {result[0]}")
            except Exception as e:
                print(f"  DNS {dns_server}: FAILED - {e}")
        
        return True
        
    except socket.gaierror as e:
        print(f"[ERROR] DNS Resolution failed: {e}")
        print("[DEBUG] Trying alternative DNS resolution...")
        
        # Test avec getaddrinfo
        try:
            result = socket.getaddrinfo(hostname, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
            print(f"[ALTERNATIVE] getaddrinfo found: {result[0][4][0]}")
            return True
        except Exception as e2:
            print(f"[ERROR] Alternative DNS also failed: {e2}")
            return False

def test_network_connectivity():
    """Test connectivité réseau"""
    print("\nNETWORK CONNECTIVITY TEST")
    print("=" * 28)
    
    url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
    
    # Test ping équivalent
    hostname = "bpyftqmkqwtmhqvuqctf.supabase.co"
    port = 443
    
    print(f"[TEST] TCP connection to {hostname}:{port}")
    
    try:
        # Test socket connection
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)  # 10 secondes timeout
        result = sock.connect_ex((hostname, port))
        sock.close()
        
        if result == 0:
            print(f"[OK] TCP connection successful")
        else:
            print(f"[ERROR] TCP connection failed: error code {result}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Socket connection failed: {e}")
        return False
    
    # Test HTTP request
    print(f"[TEST] HTTP request to {url}")
    
    try:
        # Test avec différents timeouts
        for timeout in [5, 10, 30]:
            print(f"  Testing timeout {timeout}s...")
            response = requests.get(url, timeout=timeout, verify=False)
            print(f"  [OK] HTTP {timeout}s: Status {response.status_code}")
            return True
            
    except requests.exceptions.ConnectTimeout:
        print(f"[ERROR] Connection timeout")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] Connection error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] HTTP request failed: {e}")
        return False

def test_ssl_certificates():
    """Test certificats SSL"""
    print("\nSSL CERTIFICATE TEST")
    print("=" * 20)
    
    hostname = "bpyftqmkqwtmhqvuqctf.supabase.co"
    port = 443
    
    try:
        # Test certificat SSL
        context = ssl.create_default_context()
        
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                print(f"[OK] SSL Certificate valid")
                print(f"  Subject: {cert.get('subject')}")
                print(f"  Issuer: {cert.get('issuer')}")
                print(f"  Expires: {cert.get('notAfter')}")
                return True
                
    except ssl.SSLError as e:
        print(f"[ERROR] SSL Error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] SSL test failed: {e}")
        return False

def test_supabase_auth():
    """Test authentification Supabase"""
    print("\nSUPABASE AUTHENTICATION TEST")
    print("=" * 32)
    
    url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweWZ0cW1rcXd0bWhxdnVxY3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzA0MzIsImV4cCI6MjAzOTc0NjQzMn0.v-7pO7w5lZJrJAYcEAzN5ZRBrqOFFgpOxzFVWX5ZCSM"
    
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    
    # Test endpoint REST API
    api_url = f"{url}/rest/v1/matches"
    
    try:
        print(f"[TEST] Supabase REST API: {api_url}")
        
        # Test avec pagination (limite 1000)
        params = {'limit': 5, 'offset': 0}
        
        response = requests.get(api_url, headers=headers, params=params, timeout=30)
        
        print(f"[RESPONSE] Status: {response.status_code}")
        print(f"[RESPONSE] Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] Data received: {len(data)} records")
            if data:
                print(f"[SAMPLE] First record keys: {list(data[0].keys())}")
            return True
        else:
            print(f"[ERROR] HTTP {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectTimeout:
        print(f"[ERROR] Request timeout")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] Connection error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] API test failed: {e}")
        return False

def test_supabase_pagination():
    """Test pagination Supabase (limite 1000)"""
    print("\nSUPABASE PAGINATION TEST")
    print("=" * 25)
    
    url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweWZ0cW1rcXd0bWhxdnVxY3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzA0MzIsImV4cCI6MjAzOTc0NjQzMn0.v-7pO7w5lZJrJAYcEAzN5ZRBrqOFFgpOxzFVWX5ZCSM"
    
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'  # Pour obtenir le count total
    }
    
    api_url = f"{url}/rest/v1/matches"
    
    try:
        # Test count total
        print("[TEST] Getting total count...")
        response = requests.head(api_url, headers=headers, timeout=30)
        
        if 'content-range' in response.headers:
            content_range = response.headers['content-range']
            print(f"[INFO] Content-Range: {content_range}")
            
            # Parse total count
            if '/' in content_range:
                total_count = content_range.split('/')[-1]
                print(f"[INFO] Total matches: {total_count}")
                
                if total_count != '*' and int(total_count) > 1000:
                    print(f"[WARNING] Total {total_count} > 1000 - Pagination needed!")
                    
                    # Test pagination
                    pages_needed = (int(total_count) // 1000) + 1
                    print(f"[INFO] Pages needed: {pages_needed}")
                    
                    # Test première page
                    params = {'limit': 1000, 'offset': 0}
                    response = requests.get(api_url, headers=headers, params=params, timeout=30)
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"[OK] Page 1: {len(data)} records")
                        
                        # Test deuxième page si nécessaire
                        if pages_needed > 1:
                            params = {'limit': 1000, 'offset': 1000}
                            response2 = requests.get(api_url, headers=headers, params=params, timeout=30)
                            
                            if response2.status_code == 200:
                                data2 = response2.json()
                                print(f"[OK] Page 2: {len(data2)} records")
                                return True
                            else:
                                print(f"[ERROR] Page 2 failed: {response2.status_code}")
                                return False
                    else:
                        print(f"[ERROR] Page 1 failed: {response.status_code}")
                        return False
                else:
                    print(f"[OK] Total {total_count} <= 1000 - No pagination needed")
                    return True
        else:
            print("[WARNING] No content-range header")
            return False
            
    except Exception as e:
        print(f"[ERROR] Pagination test failed: {e}")
        return False

def test_proxy_firewall():
    """Test proxy/firewall issues"""
    print("\nPROXY/FIREWALL TEST")
    print("=" * 20)
    
    # Test variables environnement proxy
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
    
    print("[INFO] Checking proxy environment variables...")
    for var in proxy_vars:
        value = os.environ.get(var)
        if value:
            print(f"  {var}: {value}")
        else:
            print(f"  {var}: Not set")
    
    # Test avec proxy explicite disabled
    print("\n[TEST] Testing without proxy...")
    
    try:
        session = requests.Session()
        session.proxies = {}  # Disable proxies
        
        response = session.get("https://httpbin.org/ip", timeout=10)
        if response.status_code == 200:
            ip_info = response.json()
            print(f"[OK] External IP: {ip_info.get('origin')}")
            return True
        else:
            print(f"[ERROR] External IP test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Proxy test failed: {e}")
        return False

def main():
    """Diagnostic complet"""
    print("DEEP SUPABASE CONNECTION DIAGNOSTIC")
    print("=" * 50)
    print("Objective: Identify and fix connection issues")
    print("Critical for: Real ML data access and 55-60% target")
    
    tests = [
        ("DNS Resolution", test_dns_resolution),
        ("Network Connectivity", test_network_connectivity), 
        ("SSL Certificates", test_ssl_certificates),
        ("Proxy/Firewall", test_proxy_firewall),
        ("Supabase Auth", test_supabase_auth),
        ("Pagination", test_supabase_pagination)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"RUNNING: {test_name}")
        print(f"{'='*60}")
        
        try:
            result = test_func()
            results[test_name] = result
            print(f"[RESULT] {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            print(f"[EXCEPTION] {test_name}: {e}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'='*60}")
    print("DIAGNOSTIC SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {test_name}: {status}")
    
    # Recommendations
    print(f"\nRECOMMENDATIONS")
    print("=" * 15)
    
    if passed == total:
        print("✓ All tests passed - Connection should work")
        print("  Action: Try Supabase library again")
        print("  Check: Python supabase library version")
    elif passed >= total * 0.7:
        print("⚠ Most tests passed - Partial connectivity")
        print("  Action: Focus on failed tests")
        print("  Workaround: Use REST API directly")
    else:
        print("✗ Multiple failures - Network/Security issue")
        print("  Action: Check network configuration")
        print("  Escalate: Contact network administrator")
    
    # Specific issues
    if not results.get("DNS Resolution", True):
        print("\n[DNS] Try: Change DNS to 8.8.8.8 or 1.1.1.1")
    
    if not results.get("Proxy/Firewall", True):
        print("\n[PROXY] Try: Disable proxy or add Supabase to whitelist")
    
    if not results.get("Supabase Auth", True):
        print("\n[AUTH] Try: Verify API key and permissions")
    
    return results

if __name__ == "__main__":
    try:
        results = main()
        
        # Return code for scripting
        if all(results.values()):
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Failure
            
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Diagnostic cancelled")
        sys.exit(2)