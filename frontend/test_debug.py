# -*- coding: utf-8 -*-
"""
调试脚本 - 查看页面实际内容
"""
from playwright.sync_api import sync_playwright
import time

def debug_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        print("正在访问页面...")
        page.goto('http://localhost:5177')
        page.wait_for_load_state('networkidle')
        time.sleep(3)
        
        # 截图
        page.screenshot(path='c:/Users/Li Hao/Desktop/origin_education_demo/frontend/debug_screenshot.png', full_page=True)
        print("截图已保存: debug_screenshot.png")
        
        # 获取页面标题
        title = page.title()
        print(f"页面标题: {title}")
        
        # 获取页面 URL
        url = page.url
        print(f"当前 URL: {url}")
        
        # 获取页面内容的前 2000 字符
        content = page.content()
        print(f"\n页面内容长度: {len(content)} 字符")
        print("\n=== 页面内容前 2000 字符 ===")
        print(content[:2000])
        
        # 查找所有按钮
        buttons = page.locator('button').all()
        print(f"\n找到 {len(buttons)} 个按钮")
        for i, btn in enumerate(buttons[:5]):
            try:
                text = btn.text_content()
                print(f"  按钮 {i+1}: {text}")
            except:
                pass
        
        # 检查控制台错误
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
        
        browser.close()

if __name__ == "__main__":
    debug_page()
