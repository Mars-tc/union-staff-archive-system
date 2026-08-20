# 步骤1：创建用于生成PPT的PowerShell脚本
$script = @'
$ErrorActionPreference = "Stop"
try {
    $pptApp = New-Object -ComObject PowerPoint.Application
    $pptApp.Visible = $true
    $presentation = $pptApp.Presentations.Add()
    $slideWidth = $presentation.PageSetup.SlideWidth
    $slideHeight = $presentation.PageSetup.SlideHeight

    function Add-Slide ($textContent, $titleText, $subtitleText) {
        $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 2)
        $slide.FollowMasterBackground = $false
        
        # Set Background
        $bg = $slide.Background
        $fill = $bg.Fill
        $fill.Solid()
        $fill.ForeColor.RGB = 0x000033 # Navy Blue
        
        # Add Title
        $titleShape = $slide.Shapes.Item(1)
        $titleShape.TextFrame.TextRange.Text = $titleText
        $titleShape.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
        $titleShape.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
        $titleShape.TextFrame.TextRange.Font.Size = 44
        
        if ($subtitleText) {
            $subtitleShape = $slide.Shapes.Item(2)
            $subtitleShape.TextFrame.TextRange.Text = $subtitleText
            $subtitleShape.TextFrame.TextRange.Font.Color.RGB = 0xCCCCCC
            $subtitleShape.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
            $subtitleShape.TextFrame.TextRange.Font.Size = 24
        }
    }

    # Slide 1: Cover
    $slide1 = $presentation.Slides.Add(1, 1)
    $slide1.FollowMasterBackground = $false
    $bg1 = $slide1.Background
    $fill1 = $bg1.Fill
    $fill1.Solid()
    $fill1.ForeColor.RGB = 0x000033
    $s1_title = $slide1.Shapes.Item(1)
    $s1_title.TextFrame.TextRange.Text = "工会职工档案数字化管理系统"
    $s1_title.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
    $s1_title.TextFrame.TextRange.Font.Size = 54
    $s1_sub = $slide1.Shapes.Item(2)
    $s1_sub.TextFrame.TextRange.Text = "—— 打造高效、智能、合规的新时代工会办公平台"
    $s1_sub.TextFrame.TextRange.Font.Color.RGB = 0xCCCCCC
    $s1_sub.TextFrame.TextRange.Font.Size = 28
    
    Add-Slide -titleText "赛题背景分析：传统办公模式面临的挑战" -subtitleText "" 
    # Add content manually for slide 2
    $slide2 = $presentation.Slides.Item(2)
    $tb2 = $slide2.Shapes.AddTextbox(1, 100, 150, 800, 400)
    $tb2.TextFrame.TextRange.Text = @"
左侧：行业背景
• 工会组织肩负着"职工之家"的重要职责。
• 赛题要求：实现办公无纸化、业务流程自动化。

右侧：核心痛点
• 痛点 1：流程繁琐、效率低下（依赖纸质表单，手写签名）
• 痛点 2：数据孤岛、风险难控（同病种限一次，人工排查易出错）
"@
    $tb2.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb2.TextFrame.TextRange.Font.Size = 22
    $tb2.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "解决方案：全流程数字化智能管理平台"
    $slide3 = $presentation.Slides.Item(3)
    $tb3 = $slide3.Shapes.AddTextbox(1, 100, 250, 800, 300)
    $tb3.TextFrame.TextRange.Text = @"
一句话方案：以"数字化"破局"低效化"，以"系统化"替代"人工化"。

1. 无纸化流转方案：在线表单 + 电子签名
2. 智能化防重方案：数据库驱动的病种校验模型，自动预警
"@
    $tb3.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb3.TextFrame.TextRange.Font.Size = 24
    $tb3.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "方案一：告别纸质，拥抱电子签名"
    $slide4 = $presentation.Slides.Item(4)
    $tb4 = $slide4.Shapes.AddTextbox(1, 100, 150, 400, 400)
    $tb4.TextFrame.TextRange.Text = "传统模式"
    $tb4.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb4.TextFrame.TextRange.Font.Size = 20
    $tb4.TextFrame.TextRange.Font.Color.RGB = 0xFFCCCC
    $tb4b = $slide4.Shapes.AddTextbox(1, 500, 150, 400, 400)
    $tb4b.TextFrame.TextRange.Text = @"
数字化模式
• 在线表单：随时随地提交
• 电子签名：防篡改，具法律效力
• 线上审批：进度实时可查
"@
    $tb4b.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb4b.TextFrame.TextRange.Font.Size = 20
    $tb4b.TextFrame.TextRange.Font.Color.RGB = 0xCCFFCC

    Add-Slide -titleText "方案二：数据驱动，精准防重"
    $slide5 = $presentation.Slides.Item(5)
    $tb5 = $slide5.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb5.TextFrame.TextRange.Text = @"
核心逻辑：前端实时校验 + 后端数据库校验（双重防重模型）

工作流程：
1. 用户申请时：前端实时查询，若有历史记录，立即禁用提交按钮。
2. 管理员审批时：后端再次校验，若有历史记录，弹窗预警。

价值：将"事后人工排查"变为"事前系统预警"，100%杜绝重复帮扶风险。
"@
    $tb5.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb5.TextFrame.TextRange.Font.Size = 22
    $tb5.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "技术架构：现代化、可扩展的系统设计"
    $slide6 = $presentation.Slides.Item(6)
    $tb6 = $slide6.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb6.TextFrame.TextRange.Text = @"
三层架构：
1. 表现层 (UI)：React 18 + TypeScript + Tailwind CSS
2. 业务逻辑层 (API)：Node.js + Express.js + JWT
3. 数据存储层 (DB)：PostgreSQL（事务一致性保障）
"@
    $tb6.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb6.TextFrame.TextRange.Font.Size = 24
    $tb6.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "技术亮点：高效、安全与可扩展性"
    $slide7 = $presentation.Slides.Item(7)
    $tb7 = $slide7.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb7.TextFrame.TextRange.Text = @"
亮点1：两级审核闭环机制
亮点2：事务一致性保障（SAVEPOINT）
亮点3：细粒度权限控制（RBAC）
"@
    $tb7.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb7.TextFrame.TextRange.Font.Size = 28
    $tb7.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "项目创新点：直击痛点的差异化价值"
    $slide8 = $presentation.Slides.Item(8)
    $tb8 = $slide8.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb8.TextFrame.TextRange.Text = @"
1. 业务全流程电子化
2. 精准的防重模型（前端+后端）
3. 灵活的双会员体系
4. 高效的历史数据迁移（Excel批量导入）
"@
    $tb8.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb8.TextFrame.TextRange.Font.Size = 24
    $tb8.TextFrame.TextRange.Font.Color.RGB = 0xFFFF99

    Add-Slide -titleText "预期成效：效率跃升，成本节约"
    $slide9 = $presentation.Slides.Item(9)
    $tb9 = $slide9.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb9.TextFrame.TextRange.Text = @"
• 审批效率提升：平均审批周期缩短至 3-5 个工作日（效率提升 70%）。
• 操作效率提升：单次审核操作耗时约 3 分钟（效率提升 5-6 倍）。
• 风险成本降低：系统 100% 兜底，风险成本降至 0。
"@
    $tb9.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb9.TextFrame.TextRange.Font.Size = 24
    $tb9.TextFrame.TextRange.Font.Color.RGB = 0x99FF99

    Add-Slide -titleText "管理规范与服务升级"
    $slide10 = $presentation.Slides.Item(10)
    $tb10 = $slide10.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb10.TextFrame.TextRange.Text = @"
• 数据驱动决策：提供多维度的统计报表。
• 管理流程规范化：所有操作留痕可查。
• 职工服务体验升级："让数据多跑路，让职工少跑腿"。
"@
    $tb10.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb10.TextFrame.TextRange.Font.Size = 24
    $tb10.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "项目现状与演进路线"
    $slide11 = $presentation.Slides.Item(11)
    $tb11 = $slide11.Shapes.AddTextbox(1, 100, 200, 800, 300)
    $tb11.TextFrame.TextRange.Text = @"
• 当前：[2026年8月] 核心功能开发完成。
• 未来1：[2026年Q3] 试点与反馈。
• 未来2：[2026年Q4] 历史数据迁移与全面上线。
• 展望：[2027年] 移动端适配、消息通知。
"@
    $tb11.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb11.TextFrame.TextRange.Font.Size = 22
    $tb11.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    Add-Slide -titleText "总结与致谢"
    $slide12 = $presentation.Slides.Item(12)
    $tb12 = $slide12.Shapes.AddTextbox(1, 100, 300, 800, 200)
    $tb12.TextFrame.TextRange.Text = "本系统以技术创新直击传统工会办公痛点，实现了流程的高效化、管理的规范化和服务的数字化。`n`n感谢各位评委老师的聆听！"
    $tb12.TextFrame.TextRange.Font.Name = "Microsoft YaHei"
    $tb12.TextFrame.TextRange.Font.Size = 32
    $tb12.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF

    $outputPath = "D:\Project\union-staff-archive-system\竞赛PPT.pptx"
    $presentation.SaveAs($outputPath, 24) # 24 = ppSaveAsOpenXMLPresentation
    Write-Output "PPT generated successfully at: $outputPath"
    $pptApp.Quit()
} catch {
    Write-Output "Error: $_"
    if ($pptApp) { $pptApp.Quit() }
}
'@

# 保存脚本到文件
$scriptPath = "D:\Project\union-staff-archive-system\generate_ppt.ps1"
$script | Out-File -FilePath $scriptPath -Encoding UTF8
Write-Output "PowerShell script saved to: $scriptPath"
