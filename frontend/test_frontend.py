# -*- coding: utf-8 -*-
"""
前端界面测试脚本
验证新设计系统组件是否正确显示
"""
from playwright.sync_api import sync_playwright
import time

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        print("Visiting page...")
        page.goto('http://localhost:5181')
        page.wait_for_load_state('networkidle')
        time.sleep(3)  # Wait for animations
        
        # Screenshot
        page.screenshot(path='c:/Users/Li Hao/Desktop/origin_education_demo/frontend/screenshot_auth.png', full_page=True)
        print("Screenshot saved: screenshot_auth.png")
        
        # Get page content
        content = page.content()
        print(f"Page content length: {len(content)} chars")
        
        # Check for design system elements
        checks = {
            "Platform title": "智慧教研平台" in content,
            "Slogan text": "让教学更智慧" in content or "欢迎" in content,
            "GlassCard style": "backdrop-filter" in content or "blur" in content or "rgba" in content,
            "Login button": page.locator('button').count() > 0,
        }
        
        print("\n=== Page Element Checks ===")
        for name, passed in checks.items():
            status = "[PASS]" if passed else "[FAIL]"
            print(f"{status} {name}")
        
        # Print first 500 chars of content for debugging
        print(f"\nPage content preview: {content[:500]}")
        
        browser.close()
        
        all_passed = all(checks.values())
        if all_passed:
            print("\n[SUCCESS] All checks passed!")
        else:
            print("\n[WARNING] Some checks failed.")
        
        return all_passed

if __name__ == "__main__":
    test_frontend()
