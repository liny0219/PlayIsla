import { _decorator, Component, Node, Vec3, Animation, input, Input, EventKeyboard, KeyCode, Prefab, instantiate, director } from 'cc';
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
    public moveSpeed: number = 200;
    
    @property(Animation)
    private animation: Animation = null;
    
    // 技能预制体引用
    @property(Prefab)
    private skill1Prefab: Prefab = null;

    @property(Node)
    // Shoot节点引用（技能发射起点）
    private shootNode: Node = null;
    
    @property(Node)
    // PlayerSkill容器节点引用
    private playerSkillContainer: Node = null;
    
    private isAttacking: boolean = false;
    private moveDirection: Vec3 = new Vec3(0, 0, 0);
    
    // 按键状态
    private keyStates: Map<KeyCode, boolean> = new Map();
    
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
            this.playAttackAnimation();
        }
        
        this.updateMoveDirection();
    }
    
    /**
     * 键盘抬起事件
     */
    private onKeyUp(event: EventKeyboard) {
        this.keyStates.set(event.keyCode, false);
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
     * 播放攻击动画
     */
    private playAttackAnimation() {
        if (this.animation && !this.isAttacking) {
            this.isAttacking = true;
            this.animation.play('Player_Attack');
            
            // 发射技能
            this.fireSkill();
            
            // 攻击动画播放完成后返回闲置状态
            this.animation.once(Animation.EventType.FINISHED, () => {
                this.isAttacking = false;
                this.playIdleAnimation();
            });
        }
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
        if (skillComponent) {
            console.log(`Player: Skill fired from world position (${shootWorldPos.x}, ${shootWorldPos.y}), local position (${localPos.x}, ${localPos.y})`);
        } else {
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
        // 如果在攻击中，不允许移动
        if (this.isAttacking) {
            return;
        }
        
        // 如果有移动输入
        if (this.moveDirection.length() > 0) {
            // 计算新位置
            const currentPos = this.node.position;
            const moveDistance = this.moveSpeed * deltaTime;
            const newPos = currentPos.clone().add(
                this.moveDirection.clone().multiplyScalar(moveDistance)
            );
            
            // 限制在移动范围内
            const clampedPos = this.clampPositionToRange(newPos);
            this.node.setPosition(clampedPos);
        }
    }
    
    /**
     * 组件销毁时清理事件监听
     */
    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }
} 