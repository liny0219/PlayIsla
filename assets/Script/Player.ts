import { _decorator, Component, Node, Vec3, Vec2, Animation, input, Input, EventKeyboard, KeyCode, Prefab, instantiate, director, RigidBody2D, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { PlayerSkill } from './PlayerSkill';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    // 移动范围设置 (x, y, width, height)
    @property
    public moveRangeX: number = 50;
    
    @property
    public moveRangeY: number = 50;
    
    @property
    public moveRangeWidth: number = 700;
    
    @property
    public moveRangeHeight: number = 400;
    
    // 移动速度
    @property
    public moveSpeed: number = 10;
    
    @property(Animation)
    private animation: Animation = null;
    
    // 攻击参数
    @property
    public attackInterval: number = 0.25; // 秒
    
    @property
    public autoFire: boolean = true; // 按住空格自动连发
    
    @property
    public lockMovementDuringAttack: boolean = false; // 攻击时是否锁定移动
    
    // 技能预制体引用
    @property(Prefab)
    private skill1Prefab: Prefab = null;

    @property(Node)
    // Shoot节点引用（技能发射起点）
    private shootNode: Node = null;
    
    @property(Node)
    // PlayerSkill容器节点引用
    private playerSkillContainer: Node = null;
    
    @property({ tooltip: '击退冲量强度（越大弹得越远）' })
    public knockbackImpulse: number = 220;

    private isAttacking: boolean = false;
    private moveDirection: Vec3 = new Vec3(0, 0, 0);
    
    private isFiring: boolean = false;
    private boundFireOnce: () => void = () => this.fireOnce();
    
    // 按键状态
    private keyStates: Map<KeyCode, boolean> = new Map();
    
    private rb2d: RigidBody2D | null = null;

    start() {
        if (!this.animation) {
            console.error('Player: Animation component not found!');
            return;
        }
        
        // 开始播放闲置动画
        this.playIdleAnimation();
        
        // 注册键盘输入事件
        this.registerInputEvents();
        
        // 设置初始位置在移动范围内
        this.setInitialPosition();

        // 物理组件初始化（方案B：全物理）
        this.rb2d = this.getComponent(RigidBody2D);
        const col = this.getComponent(Collider2D);
        if (this.rb2d) {
            this.rb2d.gravityScale = 0;
            this.rb2d.fixedRotation = true;
            this.rb2d.linearDamping = 5;
        }
        if (col) {
            col.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
    
    /**
     * 设置初始位置
     */
    private setInitialPosition() {
        const centerX = this.moveRangeX + this.moveRangeWidth / 2;
        const centerY = this.moveRangeY + this.moveRangeHeight / 2;
        this.node.setPosition(centerX, centerY, 0);
    }
    
    /**
     * 注册键盘输入事件
     */
    private registerInputEvents() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }
    
    /**
     * 键盘按下事件
     */
    private onKeyDown(event: EventKeyboard) {
        this.keyStates.set(event.keyCode, true);
        
        // 空格键攻击
        if (event.keyCode === KeyCode.SPACE) {
            if (this.autoFire) {
                this.startFiring();
            } else {
                this.fireOnce();
            }
        }
        
        this.updateMoveDirection();
    }
    
    /**
     * 键盘抬起事件
     */
    private onKeyUp(event: EventKeyboard) {
        this.keyStates.set(event.keyCode, false);
        
        if (event.keyCode === KeyCode.SPACE) {
            this.stopFiring();
        }
        
        this.updateMoveDirection();
    }
    
    /**
     * 更新移动方向
     */
    private updateMoveDirection() {
        this.moveDirection.set(0, 0, 0);
        
        // WSAD 控制
        if (this.keyStates.get(KeyCode.KEY_A)) {
            this.moveDirection.x -= 1;
        }
        if (this.keyStates.get(KeyCode.KEY_D)) {
            this.moveDirection.x += 1;
        }
        if (this.keyStates.get(KeyCode.KEY_W)) {
            this.moveDirection.y += 1;
        }
        if (this.keyStates.get(KeyCode.KEY_S)) {
            this.moveDirection.y -= 1;
        }
        
        // 标准化移动向量（对角线移动不会更快）
        if (this.moveDirection.length() > 0) {
            this.moveDirection.normalize();
        }
    }
    
    /**
     * 播放闲置动画
     */
    private playIdleAnimation() {
        if (this.animation && !this.isAttacking) {
            this.animation.play('Player_Idle');
        }
    }
    
    /**
     * 执行一次攻击（用于连发的单次触发）
     */
    private fireOnce() {
        // 确保动画处于攻击态（若未在攻击中则启动一次动画）
        if (!this.isAttacking) {
            this.playAttackAnimation();
        } else {
            // 动画在播放中，按间隔继续发射技能
            this.fireSkill();
        }
    }
    
    /**
     * 播放攻击动画
     */
    private playAttackAnimation() {
        if (!this.animation) {
            return;
        }
        if (this.isAttacking) {
            return;
        }
        this.isAttacking = true;
        this.animation.play('Player_Attack');
        // 首次播放时立即发射一发
        this.fireSkill();
        // 攻击动画播放完成后返回闲置状态
        this.animation.once(Animation.EventType.FINISHED, this.onAttackAnimationFinished, this);
    }

    private onAttackAnimationFinished() {
        this.isAttacking = false;
        this.playIdleAnimation();
    }
    
    /**
     * 开始连发
     */
    private startFiring() {
        if (this.isFiring) return;
        this.isFiring = true;
        // 立即来一发
        this.fireOnce();
        // 后续按间隔连发（使用绑定回调，便于停止时反注册）
        this.schedule(this.boundFireOnce, this.attackInterval);
    }
    
    /**
     * 停止连发
     */
    private stopFiring() {
        if (!this.isFiring) return;
        this.isFiring = false;
        this.unschedule(this.boundFireOnce);
    }
    
    /**
     * 发射技能
     */
    private fireSkill() {
        if (!this.skill1Prefab) {
            console.error('Player: Skill prefab not assigned!');
            return;
        }
        
        if (!this.shootNode) {
            console.error('Player: Shoot node not found!');
            return;
        }
        
        if (!this.playerSkillContainer) {
            console.error('Player: PlayerSkill container not found!');
            return;
        }
        
        // 计算Shoot节点的世界位置
        const shootWorldPos = this.shootNode.worldPosition;
        
        // 实例化技能预制体
        const skillNode = instantiate(this.skill1Prefab);
        
        // 将技能节点添加到PlayerSkill容器中
        this.playerSkillContainer.addChild(skillNode);
        
        // 将世界坐标转换为PlayerSkill容器的本地坐标
        const localPos = new Vec3();
        this.playerSkillContainer.inverseTransformPoint(localPos, shootWorldPos);
        
        // 设置技能的本地位置
        skillNode.setPosition(localPos);
        
        // 获取技能脚本组件并初始化
        const skillComponent = skillNode.getComponent(PlayerSkill);
        if (!skillComponent) {
            console.error('Player: PlayerSkill component not found on skill prefab!');
        }
    }
    
    /**
     * 限制位置在移动范围内
     */
    private clampPositionToRange(pos: Vec3): Vec3 {
        const clampedPos = pos.clone();
        clampedPos.x = Math.max(this.moveRangeX, Math.min(this.moveRangeX + this.moveRangeWidth, pos.x));
        clampedPos.y = Math.max(this.moveRangeY, Math.min(this.moveRangeY + this.moveRangeHeight, pos.y));
        return clampedPos;
    }
    
    update(deltaTime: number) {
        // 攻击时是否锁定移动
        if (this.lockMovementDuringAttack && this.isAttacking) {
            if (this.rb2d) {
                this.rb2d.linearVelocity = new Vec2(0, 0);
            }
            return;
        }

        const hasInput = this.moveDirection.length() > 0;

        // 物理速度驱动（若无刚体则兜底使用旧逻辑）
        if (this.rb2d) {
            if (hasInput) {
                this.rb2d.linearVelocity = new Vec2(
                    this.moveDirection.x * this.moveSpeed,
                    this.moveDirection.y * this.moveSpeed
                );
            } else {
                this.rb2d.linearVelocity = new Vec2(0, 0);
            }
        } else if (hasInput) {
            const currentPos = this.node.position;
            const moveDistance = this.moveSpeed * deltaTime;
            const newPos = currentPos.clone().add(
                this.moveDirection.clone().multiplyScalar(moveDistance)
            );
            const clampedPos = this.clampPositionToRange(newPos);
            this.node.setPosition(clampedPos);
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        // 简单通过名称判断（可改为分组判断）
        if (!other?.node?.name?.includes('Enemy')) return;

        const playerBody = this.rb2d;
        const enemyBody = other.node.getComponent(RigidBody2D);
        if (!playerBody || !enemyBody) return;

        // 计算碰撞法线（Box2D 法线朝向 self）
        let nx = 0, ny = 0;
        const anyContact: any = contact as any;
        if (anyContact && anyContact.getWorldManifold) {
            const wm = anyContact.getWorldManifold();
            nx = wm.normal.x; ny = wm.normal.y;
        }
        if (nx === 0 && ny === 0) {
            const p = this.node.worldPosition;
            const e = other.node.worldPosition;
            nx = p.x - e.x; ny = p.y - e.y;
            const len = Math.hypot(nx, ny) || 1;
            nx /= len; ny /= len;
        }

        const I = this.knockbackImpulse;
        const pPos = this.node.worldPosition;
        const ePos = other.node.worldPosition;

        // 对双方施加等大反向冲量
        playerBody.applyLinearImpulse(new Vec2(nx * I, ny * I), new Vec2(pPos.x, pPos.y), true);
        enemyBody.applyLinearImpulse(new Vec2(-nx * I, -ny * I), new Vec2(ePos.x, ePos.y), true);
    }
    
    /**
     * 组件销毁时清理事件监听
     */
    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.unschedule(this.boundFireOnce);
        if (this.animation) {
            this.animation.off(Animation.EventType.FINISHED, this.onAttackAnimationFinished, this);
        }
        const col = this.getComponent(Collider2D);
        if (col) {
            col.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
} 