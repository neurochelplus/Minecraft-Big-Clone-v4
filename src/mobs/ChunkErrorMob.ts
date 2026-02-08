import * as THREE from "three";
import { Mob } from "./Mob";
import type { IWorld } from "../contracts/world";
import type { IPlayerInput } from "../contracts/player";

export class ChunkErrorMob extends Mob {
  protected readonly walkSpeed: number = 0; // Moves by teleportation

  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private mouth: THREE.Mesh;

  constructor(
    world: IWorld,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);

    // --- Texture Generation ---

    // 1. Water TNT Texture
    // 16x16 Texture: Blue base, Lighter Blue center band, some vertical stripes for "TNT sticks" look?
    // TNT block usually has Top/Bottom different from Side.
    // For simplicity, we apply "Side" texture to all sides or just Box sides.
    const tntSize = 16;
    const tntData = new Uint8Array(4 * tntSize * tntSize);
    for (let i = 0; i < tntSize * tntSize; i++) {
        const row = Math.floor(i / tntSize);
        // Base: Dark Blue (0, 0, 139)
        let r = 0, g = 0, b = 139;
        
        // Band: Middle rows (6-9) -> Lighter Blue (30, 144, 255)
        if (row >= 6 && row <= 9) {
            r = 30; g = 144; b = 255;
            
            // Text/Logo simulation: White pixels in center
            const col = i % tntSize;
            if (row >= 7 && row <= 8 && col >= 4 && col <= 11) {
                // Dashed line or "TNT"
                if (col % 3 !== 0) {
                     r = 255; g = 255; b = 255;
                }
            }
        } else {
             // Vertical stripes for sticks (every 4th pixel darker?)
             const col = i % tntSize;
             if (col % 4 === 0) {
                 b = 100; // Slightly darker
             }
        }

        tntData[i * 4] = r;
        tntData[i * 4 + 1] = g;
        tntData[i * 4 + 2] = b;
        tntData[i * 4 + 3] = 255;
    }
    const tntTexture = new THREE.DataTexture(tntData, tntSize, tntSize);
    tntTexture.magFilter = THREE.NearestFilter;
    tntTexture.minFilter = THREE.NearestFilter;
    tntTexture.needsUpdate = true;


    // 2. Head Texture (Backwards Steve)
    // Front face (of the mob) should look like BACK of Steve's head (Hair).
    // Back face (of the mob) should look like FACE of Steve (Skin + Eyes).
    // Sides: Hair + Skin.
    // Top: Hair.
    // Bottom: Skin.
    
    // We can use 6 separate materials for the box.
    // Colors:
    const cHair = [0.27, 0.17, 0.12]; // Brown
    const cSkin = [0.73, 0.52, 0.40]; // Peach
    
    // Simple solid color textures for efficiency, or small data textures.
    // Let's create materials directly.
    
    // Front of Mob (Z+) -> Displays Back of Head (Hair)
    const matHeadBack = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });
    
    // Back of Mob (Z-) -> Displays Face (Skin) - This is hidden mostly but valid.
    const matHeadFace = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cSkin) });
    
    // Top
    const matHeadTop = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });
    
    // Bottom
    const matHeadBot = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cSkin) });
    
    // Sides (Hair on top, skin below? Steve has hair on sides)
    const matHeadSide = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });

    // Order: Right, Left, Top, Bottom, Front(Z+), Back(Z-)
    // Mob's Front is Z+. We want that to be Hair (Back of Steve).
    // Mob's Back is Z-. We want that to be Face (Front of Steve).
    // So:
    // Front (Z+): Hair
    // Back (Z-): Skin (where the actual face would be on a normal steve, but this mob is reversed)
    // Wait. "Steve head... turned face inside (back of head forward)".
    // So the Mob's Forward direction (Z+) presents the Back of Steve's Head.
    // The Mob's Backward direction (Z-) presents Steve's Face.
    // The "Face" of the mob (eyes) are "instead of eyes - broken pixel texture".
    // AND "Instead of eyes... 2 eyes, not 1... add mouth with same texture".
    // These glitch features should be on the VISIBLE side?
    // "Head of Steve... turned face inside". This implies we see the back of the head.
    // AND "Instead of eyes - broken pixel texture". This usually implies the glitch eyes are ON the back of the head (the visible side).
    // So on the Z+ face (Hair), we put the glitch eyes.
    
    const headMaterials = [
        matHeadSide, // Right
        matHeadSide, // Left
        matHeadTop,  // Top
        matHeadBot,  // Bottom
        matHeadBack, // Front (Z+) -> Hair (Visible side)
        matHeadFace  // Back (Z-) -> Face (Hidden side)
    ];


    // --- Body Construction ---

    // 1. Bottom Block: "TNT with Water Texture" -> Blue Box
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({ map: tntTexture });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.5;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);

    // 2. Top Block: "Steve Head Backwards"
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    this.head = new THREE.Mesh(headGeo, headMaterials);
    this.head.position.y = 1.5;
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.mesh.add(this.head);


    // 3. Glitch Features (Eyes + Mouth)
    // Texture: Purple/Black Checkerboard
    // 2x2 Texture
    const gWidth = 2;
    const gHeight = 2;
    const gSize = gWidth * gHeight;
    const gData = new Uint8Array(4 * gSize);
    // 0: Purple
    gData[0]=255; gData[1]=0; gData[2]=255; gData[3]=255;
    // 1: Black
    gData[4]=0; gData[5]=0; gData[6]=0; gData[7]=255;
    // 2: Black
    gData[8]=0; gData[9]=0; gData[10]=0; gData[11]=255;
    // 3: Purple
    gData[12]=255; gData[13]=0; gData[14]=255; gData[15]=255;
    
    const glitchTexture = new THREE.DataTexture(gData, gWidth, gHeight);
    glitchTexture.magFilter = THREE.NearestFilter;
    glitchTexture.minFilter = THREE.NearestFilter;
    glitchTexture.needsUpdate = true;
    
    const glitchMat = new THREE.MeshBasicMaterial({ map: glitchTexture });

    // Left Eye
    const eyeGeo = new THREE.PlaneGeometry(0.2, 0.2);
    this.leftEye = new THREE.Mesh(eyeGeo, glitchMat);
    // On Z+ Face (0.4 + epsilon).
    // Head center is 1.5. Width 0.8. Z+ face is at z=0.4 relative to head center.
    // Positions relative to head center (0,0,0)
    this.leftEye.position.set(-0.2, 0.1, 0.41);
    this.head.add(this.leftEye);
    
    // Right Eye
    this.rightEye = new THREE.Mesh(eyeGeo, glitchMat);
    this.rightEye.position.set(0.2, 0.1, 0.41);
    this.head.add(this.rightEye);
    
    // Mouth
    const mouthGeo = new THREE.PlaneGeometry(0.6, 0.15);
    this.mouth = new THREE.Mesh(mouthGeo, glitchMat);
    this.mouth.position.set(0, -0.2, 0.41);
    this.head.add(this.mouth);
  }

  // Override takeDamage to apply Inverted Controls
  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
    super.takeDamage(amount, attackerPos);
    
    // Only apply effect if there is a specific attacker (IPlayerInput)
    if (attackerPos) {
      this.wasHitRecently = true;

      // Teleport randomly in radius 10
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 7; // 3 to 10 blocks
      const tx = attackerPos.x + Math.sin(angle) * dist;
      const tz = attackerPos.z + Math.cos(angle) * dist;
      
      const worldX = Math.floor(tx);
      const worldZ = Math.floor(tz);
      const ty = this.world.getTopY(worldX, worldZ);

      if (ty > 0) {
          this.mesh.position.set(tx, ty + 1, tz);
          this.velocity.set(0, 0, 0);
      }
    }
  }

  private wasHitRecently = false;

  // Override update to get player access
  public update(
    delta: number,
    player?: IPlayerInput | THREE.Vector3, // Modified signature to accept IPlayerInput
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    // Check if player parameter is actually a IPlayerInput instance
    let playerInstance: IPlayerInput | undefined;
    let playerPos: THREE.Vector3 | undefined;

    if (player instanceof THREE.Vector3) {
        playerPos = player;
    } else if (player) {
        playerInstance = player;
        playerPos = playerInstance.physics.controls.object
          .position as THREE.Vector3;
    }

    if (this.wasHitRecently && playerInstance) {
        // Apply Inverted Controls
        // "Invert for 10 seconds"
        playerInstance.physics.setInvertedControls(10);
        this.wasHitRecently = false;
        
        // "Sound: Eating apple backwards" (Placeholder: We don't have sound engine setup for custom sounds yet)
    }

    super.update(delta, playerPos, onAttack, isDay);
    
    // Additional logic if we have player instance
    if (playerInstance) {
        // Rotation Lock: Only Head rotates to match player
        const playerRotY = playerInstance.physics.controls.object.rotation.y;
        this.head.rotation.y = playerRotY;
        // Body stays fixed (or random), we don't rotate this.mesh.rotation.y here
    }
  }
}
