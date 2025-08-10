import { _decorator, Component, Node, Vec3, view, UITransform } from "cc";
const { ccclass, property } = _decorator;

@ccclass("PlayerSkill")
export class PlayerSkill extends Component {
  @property({ type: Number, tooltip: "技能飞行速度" })
  flySpeed: number = 800;

  @property({ type: Number, tooltip: "技能生命周期（秒）" })
  lifeTime: number = 3.0;

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

    // 日志移除
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
    this.node.destroy();
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
}