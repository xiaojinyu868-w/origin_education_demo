# -*- coding: utf-8 -*-
"""验证新设计系统界面"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()
        
        print("正在访问 http://localhost:5173 ...")
        
        try:
            await page.goto('http://localhost:5173', wait_until='networkidle', timeout=30000)
            print("✅ 页面加载成功")
            
            # 等待页面渲染
            await page.wait_for_timeout(2000)
            
            # 截图
            screenshot_path = 'c:/Users/Li Hao/Desktop/origin_education_demo/frontend/screenshot_verify.png'
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"✅ 截图已保存: {screenshot_path}")
            
            # 获取页面标题
            title = await page.title()
            print(f"页面标题: {title}")
            
            # 检查是否有内容
            body_text = await page.evaluate('() => document.body.innerText')
            print(f"页面文本长度: {len(body_text)} 字符")
            
            if len(body_text) > 100:
                print("✅ 页面有内容")
                print(f"前 200 个字符: {body_text[:200]}")
            else:
                print("❌ 页面内容很少")
                print(f"内容: {body_text}")
            
            # 检查是否有错误
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            console_msgs = []
            page.on('console', lambda msg: console_msgs.append(f"{msg.type}: {msg.text}"))
            
            await page.wait_for_timeout(2000)
            
            if errors:
                print(f"\n❌ 页面错误 ({len(errors)}):")
                for err in errors[:5]:
                    print(f"  - {err}")
            else:
                print("\n✅ 无页面错误")
            
            if console_msgs:
                print(f"\n控制台消息 ({len(console_msgs)}):")
                for msg in console_msgs[:10]:
                    print(f"  - {msg}")
            
            print("\n浏览器保持打开状态，请手动检查界面...")
            print("按 Ctrl+C 退出")
            
            # 保持浏览器打开
            await page.wait_for_timeout(300000)  # 5分钟
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
