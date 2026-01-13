# -*- coding: utf-8 -*-
"""测试新设计系统界面"""
import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        print("正在访问前端...")
        await page.goto('http://localhost:5182')
        
        # 等待页面加载
        await page.wait_for_timeout(3000)
        
        # 截图
        await page.screenshot(path='screenshot_new_ui.png', full_page=True)
        print("截图已保存: screenshot_new_ui.png")
        
        # 获取页面内容
        content = await page.content()
        print(f"\n页面 HTML 长度: {len(content)} 字符")
        
        # 检查是否有新设计系统的组件
        glass_card = await page.query_selector('[class*="glass"]')
        if glass_card:
            print("✅ 发现 GlassCard 组件")
        else:
            print("❌ 未发现 GlassCard 组件")
        
        # 检查控制台错误
        page.on('console', lambda msg: print(f"Console: {msg.text}"))
        
        await page.wait_for_timeout(2000)
        
        input("按 Enter 关闭浏览器...")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
