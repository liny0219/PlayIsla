import { _decorator, Component, Node, Vec3, view, UITransform, RigidBody2D, Collider2D, Contact2DType, IPhysics2DContact, Vec2 } from "cc";
import { Enemy } from "./Enemy";
const { ccclass, property } = _decorator;

@ccclass("PlayerSkill")
export class PlayerSkill extends Component {
  @property({ type: Number, tooltip: "技能飞行速度" })
  flySpeed: number = 800;

  @property({ type: Number, tooltip: "技能生命周期（秒）" })
  lifeTime: number = 3.0;

  @property({ type: Number, tooltip: "对敌人的击退力度" })
  knockbackForce: number = 450;

  @property({ type: Number, tooltip: "敌人被击中时的旋转力度" })
  rotationForce: number = 1080;

  // 私有变量
  private currentLifeTime: number = 0;
  private screenBounds: { width: number; height: number } = {
    width: 0,
    height: 0,
  };

  start() {
    // 获取屏幕边界信息
    this.initScreenBounds();

    // 重置生命周期计时器
    this.currentLifeTime = 0;

    // 初始化物理组件
    this.initPhysics();

    // 设置碰撞监听
    this.setupCollisionListener();
  }

  update(deltaTime: number) {
    // 更新生命周期
    this.currentLifeTime += deltaTime;

    // 检查生命周期是否超时
    if (this.currentLifeTime >= this.lifeTime) {
      this.destroySkill();
      return;
    }

    // 向右移动
    this.moveRight(deltaTime);

    // 检查是否超出屏幕边界
    if (this.isOutOfScreen()) {
      this.destroySkill();
    }
  }

  /**
   * 初始化屏幕边界信息
   */
  private initScreenBounds(): void {
    const visibleSize = view.getVisibleSize();
    this.screenBounds.width = visibleSize.width;
    this.screenBounds.height = visibleSize.height;
  }

  /**
   * 向右移动技能
   */
  private moveRight(deltaTime: number): void {
    const currentPos = this.node.position;
    const newX = currentPos.x + this.flySpeed * deltaTime;
    const newPos = new Vec3(newX, currentPos.y, currentPos.z);
    this.node.setPosition(newPos);
  }

  /**
   * 检查技能是否超出屏幕边界
   */
  private isOutOfScreen(): boolean {
    const position = this.node.position;
    const halfScreenWidth = this.screenBounds.width / 2;
    const halfScreenHeight = this.screenBounds.height / 2;

    // 获取节点的UITransform组件来获取节点尺寸
    const uiTransform = this.node.getComponent(UITransform);
    const nodeWidth = uiTransform ? uiTransform.contentSize.width : 0;
    const nodeHeight = uiTransform ? uiTransform.contentSize.height : 0;

    // 检查是否完全超出屏幕右边界
    const rightBound = halfScreenWidth + nodeWidth / 2;
    const leftBound = -halfScreenWidth - nodeWidth / 2;
    const topBound = halfScreenHeight + nodeHeight / 2;
    const bottomBound = -halfScreenHeight - nodeHeight / 2;

    return (
      position.x > rightBound || // 超出右边界
      position.x < leftBound || // 超出左边界
      position.y > topBound || // 超出上边界
      position.y < bottomBound // 超出下边界
    );
  }

  /**
   * 销毁技能节点
   */
  private destroySkill(): void {
    // 延迟销毁节点，避免在碰撞回调中立即销毁导致的刚体操作错误
    this.scheduleOnce(() => {
      this.node.destroy();
    }, 0);
  }

  /**
   * 设置技能的初始位置（通常是玩家位置）
   */
  public setStartPosition(position: Vec3): void {
    this.node.setPosition(position);
    // 日志移除
  }

  /**
   * 设置飞行速度
   */
  public setFlySpeed(speed: number): void {
    this.flySpeed = speed;
    // 日志移除
  }

  /**
   * 设置生命周期
   */
  public setLifeTime(time: number): void {
    this.lifeTime = time;
    // 日志移除
  }

  /**
   * 获取当前技能位置
   */
  public getCurrentPosition(): Vec3 {
    return this.node.position.clone();
  }

  /**
   * 初始化物理组件
   */
  private initPhysics(): void {
    const rb2d = this.getComponent(RigidBody2D);
    if (rb2d) {
      // 确保基本物理设置（预制体中已配置好类型）
      rb2d.gravityScale = 0;
      rb2d.enabledContactListener = true;
    }
  }

  /**
   * 设置碰撞监听
   */
  private setupCollisionListener(): void {
    const collider = this.getComponent(Collider2D);
    if (collider) {
      collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }

  /**
   * 碰撞开始事件处理
   */
  private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
    // 检查是否击中敌人
    if (other.node.name.includes('Enemy')) {
      this.hitEnemy(other);
      return;
    }

    // 检查是否击中墙体
    if (other.node.name.includes('Wall') || other.node.parent?.name === 'Walls') {
      this.destroySkill();
      return;
    }
  }

  /**
   * 击中敌人处理
   */
  private hitEnemy(enemyCollider: Collider2D): void {
    const enemyNode = enemyCollider.node;
    const enemyScript = enemyNode.getComponent(Enemy);
    
    if (enemyScript) {
      // 计算击退方向（从子弹到敌人）
      const skillPos = this.node.worldPosition;
      const enemyPos = enemyNode.worldPosition;
      
      let dx = enemyPos.x - skillPos.x;
      let dy = enemyPos.y - skillPos.y;
      const distance = Math.hypot(dx, dy) || 1;
      
      // 标准化方向向量
      dx /= distance;
      dy /= distance;
      
      const knockbackDirection = new Vec2(dx, dy);
      const knockbackForce = new Vec2(dx * this.knockbackForce, dy * this.knockbackForce);
      
      // 使用子弹当前位置作为击中点
      const hitPoint = skillPos.clone();
      
      // 立即调用敌人被击中处理（Enemy内部会安全地延迟物理操作）
      enemyScript.onHit(knockbackDirection, this.rotationForce, knockbackForce, hitPoint);
    }

    // 子弹击中敌人后销毁（延迟销毁避免物理错误）
    this.destroySkill();
  }

  /**
   * 组件销毁时清理
   */
  onDestroy(): void {
    const collider = this.getComponent(Collider2D);
    if (collider) {
      collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }
}