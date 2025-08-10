# 项目进度

## 已完成功能 ✅

### 角色系统
- ✅ Player.ts：玩家控制脚本
  - ✅ WSAD键控制移动
  - ✅ 空格键触发攻击
  - ✅ 移动范围限制
  - ✅ 玩家攻击动画播放
  - ✅ **技能发射系统：从Shoot节点发射Player_Skill1技能**
  
- ✅ Enemy.ts：敌人AI脚本
  - ✅ 随机移动逻辑
  - ✅ 定期攻击动画播放
  - ✅ （方案B）物理驱动移动：Dynamic 刚体 + 线速度追踪随机点
  
- ✅ PlayerSkill.ts：玩家技能脚本
### 物理系统
- ✅ 启用 2D 物理方案设计（方案B）：
  - ✅ Player/Enemy 均改为 Dynamic 刚体，添加 `BoxCollider2D`
  - ✅ Player 在 `BEGIN_CONTACT` 时对双方施加击退冲量（`knockbackImpulse`）
  - ✅ Player/Enemy 移动改为线速度驱动
  - ✅ 技能移动逻辑
  - ✅ 生命周期管理
  - ✅ 屏幕边界检测
  - ✅ **自动播放Player_Skill1动画**
  - ✅ 清理调试日志

### 资源系统
- ✅ 角色动画资源（Player_Idle, Player_Attack, Enemy_Idle, Enemy_Attack）
- ✅ 技能动画资源（Player_Skill1动画，48帧）
- ✅ PlayerSkill1预制体（包含技能脚本和动画组件）
- ✅ 背景图片资源

### 场景结构
- ✅ Game.scene场景文件
- ✅ Player节点层级（包含Body子节点和Shoot子节点）
- ✅ Enemy节点配置
- ✅ **PlayerSkill容器节点（自动创建管理技能实例）**

## 正在进行的工作 ⏳
- 为场景节点配置刚体与碰撞盒（编辑器侧）
- 添加边界静态墙替代 clamp

## 待完成功能 📝
- 技能与敌人的物理碰撞/伤害结算
- 游戏状态管理
- UI界面
- 音效系统 