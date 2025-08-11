import { _decorator, Component, Node, Vec3, Vec2, Animation, RigidBody2D, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    // 物理弹珠设置
    @property({ type: Number, tooltip: "物理阻尼系数" })
    public linearDamping: number = 0.3;
    
    @property({ type: Number, tooltip: "角阻尼系数" })
    public angularDamping: number = 0.2;
    
    @property({ type: Number, tooltip: "墙体反弹强度" })
    public bounceStrength: number = 0.8;
    
    @property({ type: Number, tooltip: "最小运动速度阈值" })
    public minVelocityThreshold: number = 5;
    

    
    @property(Animation)
    private animation: Animation = null;
    private rb2d: RigidBody2D | null = null;
    private isHit: boolean = false;
    
    start() {
        if (!this.animation) {
            console.error('Enemy: Animation component not found!');
            return;
        }
        
        // 初始化刚体 - 弹珠物理配置
        this.rb2d = this.getComponent(RigidBody2D);
        if (this.rb2d) {
            this.rb2d.gravityScale = 0;
            this.rb2d.fixedRotation = false; // 允许自由旋转
            this.rb2d.linearDamping = this.linearDamping;
            this.rb2d.angularDamping = this.angularDamping;
            this.rb2d.type = 2; // 确保是Dynamic类型
        }

        // 设置碰撞监听（用于墙体反弹）
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // 开始闲置动画
        this.playIdleAnimation();
    }
    
    /**
     * 播放闲置动画
     */
    private playIdleAnimation() {
        if (this.animation && !this.isHit) {
            this.animation.play('Enemy_Idle');
        }
    }

    /**
     * 播放被击中动画
     */
    private playHitAnimation() {
        if (!this.animation) {
            return;
        }
        
        this.isHit = true;
        this.animation.play('Enemy_Hit');
        
        // 被击中动画播放完成后返回闲置状态
        this.animation.once(Animation.EventType.FINISHED, () => {
            this.isHit = false;
            this.playIdleAnimation();
        });
    }
    
    update(dt: number) {
        if (!this.rb2d) {
            return;
        }
        
        // 当速度过低时自动停止，避免持续微小运动
        const velocity = this.rb2d.linearVelocity;
        const speed = Math.hypot(velocity.x, velocity.y);
        
        if (speed < this.minVelocityThreshold && speed > 0.1) {
            this.rb2d.linearVelocity = new Vec2(0, 0);
            this.rb2d.angularVelocity = 0;
        }
    }
    
    /**
     * 被击中处理（供外部调用）
     */
    public onHit(knockbackDirection: Vec2, rotationForce: number = 360, knockbackForce?: Vec2, hitPoint?: Vec3): void {
        // 播放被击中动画
        this.playHitAnimation();
        
        // 施加击退力
        if (knockbackForce && this.rb2d) {
            this.applyKnockback(knockbackForce, hitPoint);
        }
    }

    /**
     * 施加击退力 - 弹珠风格
     */
    private applyKnockback(knockbackForce: Vec2, hitPoint?: Vec3): void {
        if (!this.rb2d) return;
        
        // 延迟执行击退逻辑，避免在碰撞回调中直接操作刚体
        this.scheduleOnce(() => {
            if (!this.rb2d || !this.rb2d.node || !this.rb2d.node.isValid) return;
            
            const enemyWorldPos = this.rb2d.node.worldPosition;
            let forcePoint = new Vec2(enemyWorldPos.x, enemyWorldPos.y);
            
            // 如果提供了击中点，使用击中点作为力的作用点
            if (hitPoint) {
                forcePoint = new Vec2(hitPoint.x, hitPoint.y);
            }
            
            // 强制唤醒刚体以确保物理响应
            this.rb2d.wakeUp();
            
            // 施加线性冲量
            this.rb2d.applyLinearImpulse(knockbackForce, forcePoint, true);
            
            // 添加旋转效果
            const randomRotation = (Math.random() - 0.5) * 1000;
            this.rb2d.applyAngularImpulse(randomRotation, true);
        }, 0);
    }

    /**
     * 碰撞处理（主要用于墙体反弹）
     */
    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null): void {
        // 检查是否与墙体碰撞
        if (other.node.name.includes('Wall') || other.node.parent?.name === 'Walls') {
            this.handleWallBounce(contact);
            return;
        }
        
        // 忽略与玩家和子弹的碰撞（由它们各自处理）
    }

    /**
     * 处理墙体反弹 - 弹珠台风格
     */
    private handleWallBounce(contact: IPhysics2DContact | null): void {
        if (!this.rb2d || !contact) return;
        
        // 延迟处理反弹，避免碰撞回调中的刚体操作错误
        this.scheduleOnce(() => {
            if (!this.rb2d || !this.rb2d.node || !this.rb2d.node.isValid) return;
            
            // 获取当前速度
            const currentVelocity = this.rb2d.linearVelocity;
            const speed = Math.hypot(currentVelocity.x, currentVelocity.y);
            
            // 弹珠台效果：即使速度很小也要反弹
            if (speed < 10) return;
            
            // 计算反弹方向
            let bounceDirection = this.calculateBounceDirection(contact);
            
            // 弹珠台风格：反弹保持较高的速度和能量
            const bounceForce = Math.max(speed * this.bounceStrength, 50);
            const bounceVelocity = new Vec2(
                bounceDirection.x * bounceForce,
                bounceDirection.y * bounceForce
            );
            
            // 添加一些随机性让反弹更有趣
            const randomFactor = 0.15;
            bounceVelocity.x += (Math.random() - 0.5) * randomFactor * bounceForce;
            bounceVelocity.y += (Math.random() - 0.5) * randomFactor * bounceForce;
            
            this.rb2d.linearVelocity = bounceVelocity;
            
            // 弹珠台效果：每次反弹都增加旋转
            const bounceRotation = (Math.random() - 0.5) * 800;
            this.rb2d.applyAngularImpulse(bounceRotation, true);
        }, 0);
    }

    /**
     * 计算反弹方向
     */
    private calculateBounceDirection(contact: IPhysics2DContact): Vec2 {
        // 尝试获取碰撞法线
        let normal = new Vec2(0, 0);
        const anyContact: any = contact as any;
        
        if (anyContact && anyContact.getWorldManifold) {
            const wm = anyContact.getWorldManifold();
            normal.x = -wm.normal.x; // 反转法线方向
            normal.y = -wm.normal.y;
        }
        
        // 如果无法获取法线，使用简单的边界检测
        if (normal.x === 0 && normal.y === 0) {
            const enemyPos = this.node.worldPosition;
            const screenHalfWidth = 368;
            const screenHalfHeight = 207;
            
            // 判断碰撞的是哪面墙
            if (Math.abs(enemyPos.x - screenHalfWidth) < Math.abs(enemyPos.x + screenHalfWidth)) {
                normal.x = -1; // 右墙
            } else if (Math.abs(enemyPos.x + screenHalfWidth) < 50) {
                normal.x = 1; // 左墙
            }
            
            if (Math.abs(enemyPos.y - screenHalfHeight) < Math.abs(enemyPos.y + screenHalfHeight)) {
                normal.y = -1; // 上墙
            } else if (Math.abs(enemyPos.y + screenHalfHeight) < 50) {
                normal.y = 1; // 下墙
            }
        }
        
        // 标准化法线向量
        const length = Math.hypot(normal.x, normal.y) || 1;
        normal.x /= length;
        normal.y /= length;
        
        return normal;
    }


    /**
     * 组件销毁时清理定时器
     */
    onDestroy() {
        this.unscheduleAllCallbacks();
        
        // 清理碰撞监听
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}