import { _decorator, Component, Node, Vec3, Vec2, Animation, RigidBody2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    // 移动范围设置 (x, y, width, height)
    @property
    public moveRangeX: number = 0;
    
    @property
    public moveRangeY: number = 365;
    
    @property
    public moveRangeWidth: number = 170;
    
    @property
    public moveRangeHeight: number = 170;
    
    // 移动速度
    @property
    public moveSpeed: number = 30;
    
    // 攻击动画播放间隔(秒)
    @property
    public attackInterval: number = 3.0;
    
    // 移动间隔(秒)
    @property
    public moveInterval: number = 2.0;
    
    @property(Animation)
    private animation: Animation = null;
    private isAttacking: boolean = false;
    private rb2d: RigidBody2D | null = null;
    private targetPos: Vec3 | null = null;
    
    start() {
        if (!this.animation) {
            console.error('Enemy: Animation component not found!');
            return;
        }
        
        // 初始化刚体
        this.rb2d = this.getComponent(RigidBody2D);
        if (this.rb2d) {
            this.rb2d.gravityScale = 0;
            this.rb2d.fixedRotation = true;
            this.rb2d.linearDamping = 5;
        }

        // 开始闲置动画
        this.playIdleAnimation();

        // 物理移动：选择随机目标并周期切换
        this.pickRandomTarget();
        this.schedule(this.pickRandomTarget, this.moveInterval);

        // 开始定期攻击
        this.scheduleAttack();
    }
    
    /**
     * 播放闲置动画
     */
    private playIdleAnimation() {
        if (this.animation && !this.isAttacking) {
            this.animation.play('Enemy_Idle');
        }
    }
    
    /**
     * 播放攻击动画
     */
    private playAttackAnimation() {
        if (this.animation && !this.isAttacking) {
            this.isAttacking = true;
            this.animation.play('Enemy_Attack');
            
            // 攻击动画播放完成后返回闲置状态
            this.animation.once(Animation.EventType.FINISHED, () => {
                this.isAttacking = false;
                this.playIdleAnimation();
            });
        }
    }
    
    /**
     * 获取随机目标位置
     */
    private getRandomPosition(): Vec3 {
        const randomX = this.moveRangeX + Math.random() * this.moveRangeWidth;
        const randomY = this.moveRangeY + Math.random() * this.moveRangeHeight;
        return new Vec3(randomX, randomY, 0);
    }
    
    /**
     * 移动到目标位置
     */
    private pickRandomTarget = () => {
        const randomX = this.moveRangeX + Math.random() * this.moveRangeWidth;
        const randomY = this.moveRangeY + Math.random() * this.moveRangeHeight;
        this.targetPos = new Vec3(randomX, randomY, 0);
    }
    
    /**
     * 安排随机移动
     */
    update(dt: number) {
        if (!this.rb2d) {
            return;
        }
        if (this.isAttacking || !this.targetPos) {
            this.rb2d.linearVelocity = new Vec2(0, 0);
            return;
        }

        const cur = this.node.worldPosition;
        const dx = this.targetPos.x - cur.x;
        const dy = this.targetPos.y - cur.y;
        const len = Math.hypot(dx, dy);

        if (len < 4) {
            this.rb2d.linearVelocity = new Vec2(0, 0);
            this.pickRandomTarget();
            return;
        }

        const nx = dx / len;
        const ny = dy / len;
        this.rb2d.linearVelocity = new Vec2(nx * this.moveSpeed, ny * this.moveSpeed);
    }
    
    /**
     * 安排定期攻击
     */
    private scheduleAttack() {
        this.schedule(() => {
            this.playAttackAnimation();
        }, this.attackInterval);
    }
    
    /**
     * 组件销毁时清理定时器
     */
    onDestroy() {
        this.unscheduleAllCallbacks();
    }
} 