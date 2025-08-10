import { _decorator, Component, Node, Vec3, Animation, randomRangeInt, tween } from 'cc';
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
    public moveSpeed: number = 50;
    
    // 攻击动画播放间隔(秒)
    @property
    public attackInterval: number = 3.0;
    
    // 移动间隔(秒)
    @property
    public moveInterval: number = 2.0;
    
    @property(Animation)
    private animation: Animation = null;
    private isAttacking: boolean = false;
    private isMoving: boolean = false;
    
    start() {
        if (!this.animation) {
            console.error('Enemy: Animation component not found!');
            return;
        }
        
        // 开始闲置动画
        this.playIdleAnimation();
        
        // 开始随机移动
        this.scheduleRandomMove();
        
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
    private moveToPosition(targetPos: Vec3) {
        if (this.isMoving || this.isAttacking) {
            return;
        }
        
        this.isMoving = true;
        const currentPos = this.node.position;
        const distance = Vec3.distance(currentPos, targetPos);
        const duration = distance / this.moveSpeed;
        
        tween(this.node)
            .to(duration, { position: targetPos })
            .call(() => {
                this.isMoving = false;
            })
            .start();
    }
    
    /**
     * 安排随机移动
     */
    private scheduleRandomMove() {
        this.schedule(() => {
            if (!this.isAttacking) {
                const randomPos = this.getRandomPosition();
                this.moveToPosition(randomPos);
            }
        }, this.moveInterval);
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