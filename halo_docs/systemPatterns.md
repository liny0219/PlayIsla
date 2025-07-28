# 系统架构模式

## 技术架构
- 基于Cocos Creator 3.8.6引擎
- TypeScript作为主要开发语言
- 组件化架构模式

## 关键技术决策
- 使用.ts文件编写游戏逻辑
- 动画系统使用.anim文件
- 资源管理通过assets目录结构

## 项目结构
- assets/: 所有游戏资源
  - Animation/: 动画文件
  - Image/: 图片资源
  - Scene/: 场景文件
  - Script/: 脚本文件
  - Prefab/: 预制体

## 编码模式
- 组件继承自Component
- 使用装饰器标记组件属性
- 生命周期方法：start(), update()等 