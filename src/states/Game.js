/* globals __DEV__ */
import Phaser from 'phaser'

export default class extends Phaser.State {
  constructor () {
    super()
    this.style = {
      font: 'Raleway'
    }
    this.score = 0
    this.highScore = localStorage.highScore
    this.gameTime = {
      total: 0,
      stopped: true,
      paused: false
    }
    this.gameInPlay = false
    this.endGame = false
    this.gameOver = false
    this.direction = 'down'
    this.gameStartText = this.gameStartText
    this.heroSize = 16
    this.touchableTiles = []
    this.specialTouchableTiles = []
    this.touchableObjects = []
    this.specialTouchableObjects = []
    this.tile = {
      width: 45,
      height: 45
    }
    this.objects = {
      layer: 'otee-objects-layer',
      spritesheet: 'objects',
      width: 25,
      height: 25,
      count: 0,
      collected: 0
    }
    this.panel = {
      bgCol: 0xffd670,
      textCol: 0x2D3A44
    }
    this.overlay = {
      bgColHex: '#FFD670',
      bgCol: 0xFFD670,
      bgCol2: 0x8777f9,
      bgCol3: 0x16B77F,
      textCol: '#8777f9',
      textCol2: '#FFFFFF'
    }
    this.heroColor = {
      current: 0xFF7F66,
      default: 0x8777f9,
      slow: 0xFF0000,
      fast: 0xFFFFFF,
      trail: 0xFF7F66
    }
    this.heroStart = {
      x: 196,
      y: 55,
      originalY: 55,
      inPosition: false,
      lives: 1,
      pivot: 6
    }
    this.badGuysMovement = {
      velocity: 30,
      rtl: true,
      ltr: true
    }
    this.speedTimerInMotion = false
    this.gameRules = {
      gameSpeed: 1,
      heroSpeedDefault: 180,
      heroSpeedFast: 200,
      heroSpeedSlow: 160,
      heroSpeedCurrent: 180,
      triggerCameraHeight: 250,
      reverseHero: false,
      speedTimer: 3
    }
    this.textStyle = { font: this.style.font, fontSize: '12px', fill: this.panel.textCol, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' }
    this.textOverlayStyle = { font: this.style.font, fontSize: '18px', fill: this.panel.textCol, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' }
    this.bonusPoints = 0
  }

  init () {}
  preload () {
    this.load.image('blocks', 'assets/images/tiles.png')
    this.load.spritesheet('objects', 'assets/images/objects.png', 25, 25)
    this.load.tilemap('map1', 'assets/data/otee-map-1.json', null, Phaser.Tilemap.TILED_JSON)
  }

  // Walls
  wallBuilder () {
    this.tileMap = this.add.tilemap('map1')

    //  The first parameter is the tileset name, as specified in the Tiled map editor (and in the tilemap json file)
    //  The second parameter maps this name to the Phaser.Cache key 'blocks'
    this.tileMap.addTilesetImage('otee-tileset', 'blocks')
    this.tileMap.addTilesetImage('otee-objects', 'objects')

    //  Creates a layer from the JSON layer in the map data.
    //  A Layer is effectively like a Phaser.Sprite, so is added to the display list.
    this.mapLayer = this.tileMap.createLayer('otee-tile-layer')

    // Required to move camera it seems
    this.mapLayer.resizeWorld()

    // Allow objects to be touched
    this.objectsGroup = this.add.physicsGroup()

    // See handleTileCollision
    this.tileMap.setTileIndexCallback(2, this.handleTileCollision, this)
    this.tileMap.setTileIndexCallback(3, this.reverseHero, this)
    this.tileMap.setTileIndexCallback(4, this.handleCheckpoint, this)

    // Collision
    this.tileMap.setCollisionByExclusion([2, 4])
  }

  handleTileCollision (sprite, tile) {
    let index = tile.index
    let text
    let heroSpeed = this.gameRules.heroSpeedCurrent
    let tileAlpha = 0.3

    switch (index) {
      case 1:
        text = 'SLOW DOWN'
        heroSpeed = 100
        break
      case 2:
        tileAlpha = 0.9
        break
      case 3:
        text = 'FLIP REVERSE'
        tileAlpha = 1
        break
      case 4:
        tileAlpha = 0.9
        break
      default:
        break
    }

    this.showHeroText(text, 400)

    // Change opacity down
    tile.alpha = tileAlpha
    this.gameRules.heroSpeedCurrent = heroSpeed
    this.mapLayer.dirty = true

    // Tiles to be reset for each death go here
    if (index === 2) {
      // Add the touched tile to an array
      this.touchableTiles.push(tile)
    } else {
      // Else end of game reset tiles go here
      this.specialTouchableTiles.push(tile)
    }
  }

  // Reset touched items (tiles & objects)
  resetTouchableItems () {
    // Convert alpha back to 1
    this.touchableTiles.forEach((touchedTile) => {
      touchedTile.alpha = 1
    })
    // Refresh map
    this.mapLayer.dirty = true

    // Revive objects
    this.touchableObjects.forEach((touchedObject) => {
      touchedObject.revive()
    })

    // Clear touched tiles array
    this.touchableTiles = []
    // Clear touched objects array
    this.touchableObjects = []
  }

  // Reset SPECIAL touched items - reset only on GAME OVER (tiles & objects)
  resetSpecialTouchableItems () {
    // Convert alpha back to 1
    this.specialTouchableTiles.forEach((touchedTile) => {
      touchedTile.alpha = 1
    })

    // Revive objects
    this.specialTouchableObjects.forEach((touchedObject) => {
      touchedObject.revive()
    })
    // Refresh map
    this.mapLayer.dirty = true
    // Clear touched tiles array
    this.specialTouchableTiles = []
    // Clear touched objects array
    this.specialTouchableObjects = []
  }

  reverseHero (sprite, tile) {
    this.gameRules.reverseHero = true
    tile.alpha = 0.2
    // Add the touched tile to an array
    this.touchableTiles.push(tile)
  }

  handleCheckpoint (sprite, tile) {
    // When we hit the tile, do things only once...
    if (tile.alpha === 1) {
      this.showHeroText('CHECKPOINT!', 1000)
    }
    tile.alpha = 0.2
    this.mapLayer.dirty = true

    this.heroStart.x = (tile.worldX + this.tile.width / 2) - this.heroSize / 2
    this.heroStart.y = (tile.worldY + this.tile.height / 2) - this.heroSize / 2

    // Add the SPECIAL touched tile to an array - reset only on GAME OVER
    this.specialTouchableTiles.push(tile)
  }

  // Store Hero History
  storeHeroHistory (xPos, yPos) {
    let x = xPos + (this.heroSize / 2) - 1
    let y = yPos + (this.heroSize / 2) - 1

    this.trail = this.add.graphics(0, 0)
    this.trail.beginFill(this.heroColor.trail, 1)
    this.trail.drawRect(x, y, 2, 2)
    // Kill off after this time...
    this.trail.lifespan = 500

    this.heroGroup.add(this.trail)
  }

  // Hero
  heroBuilder () {
    let hero = this.add.graphics(0, 0)
    hero.beginFill(this.heroColor.current, 1)
    hero.drawCircle(this.heroSize, this.heroSize, this.heroSize * 2)

    // The hero and its settings
    this.hero = this.add.sprite(this.heroStart.x, this.heroStart.y)
    this.hero.width = this.heroSize
    this.hero.height = this.heroSize
    this.hero.addChild(hero)

    let heroEye = this.add.graphics(0, 0)
    heroEye.beginFill('0xFFFFFF', 1)
    heroEye.drawCircle(this.heroSize, this.heroSize, (this.heroSize / 2) + 2)

    // Create the eye child
    this.heroEye = this.hero.addChild(heroEye)

    // We need to enable physics on the hero
    this.physics.arcade.enable(this.hero)

    this.hero.body.collideWorldBounds = true
    this.hero.checkWorldBounds = true

    if (this.hero.inCamera === false && this.gameInPlay) {
      this.handleLossOfLife()
    }

    this.heroGroup.add(this.hero)
  }

  scorePanelBuilder () {
    this.scorePanel = this.add.group()
    this.scorePanel.width = this.camera.width
    this.scorePanel.fixedToCamera = true

    let scoreBg = this.add.graphics(0, 0)
    scoreBg.beginFill(this.panel.bgCol, 1)
    scoreBg.drawRect(0, 0, this.camera.width, 35)
    scoreBg.alpha = 0.95

    // Draw heart

    let heart = this.add.graphics(this.centerX - 13.5, 4)
    heart.beginFill(0xEE5B5B, 1)
    heart.moveTo(75, 40)
    heart.bezierCurveTo(75, 37, 70, 25, 50, 25)
    heart.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5)
    heart.bezierCurveTo(20, 80, 40, 102, 75, 120)
    heart.bezierCurveTo(110, 102, 130, 80, 130, 62.5)
    heart.bezierCurveTo(130, 62.5, 130, 25, 100, 25)
    heart.bezierCurveTo(85, 25, 75, 37, 75, 40)
    heart.scale.setTo(0.18, 0.18)

    // use the bitmap data as the texture for the sprite
    this.scorePanel.add(scoreBg)
    this.scorePanel.add(heart)
  }

  // Movement events
  keyboardEvents () {
    this.cursors = this.input.keyboard.createCursorKeys()

    // Reset the reversing back to normal
    const resetReverse = () => {
      this.gameRules.reverseHero = false
    }

    //  Reset the heros velocity (keyboardEvents)
    this.hero.body.velocity.x = 0
    this.hero.body.velocity.y = 0

    if (this.cursors.left.isDown) {
      //  Move left
      this.direction = 'left'
      resetReverse()
    } else if (this.cursors.right.isDown) {
      //  Move right
      this.direction = 'right'
      resetReverse()
    } else if (this.cursors.up.isDown) {
      //  Move up
      this.direction = 'up'
      resetReverse()
    } else if (this.cursors.down.isDown) {
      //  Move down
      this.direction = 'down'
      resetReverse()
    }
  }

  moveBadGuys (direction) {
    if (direction === 'left') {
      this.badGuyGroup.children.map(badguy => (badguy.body.velocity.x = (this.hero.x + (this.hero.body.velocity.x - 20))))
    } else if (direction === 'right') {
      this.badGuyGroup.children.map(badguy => (badguy.body.velocity.x = (this.hero.x - (this.hero.body.velocity.x - 20))))
    }
  }

  moveBadGuysRTL () {
    if (this.badGuysMovement.rtl) {
      this.badGuyGroupRTL.children.map(badguy => (badguy.body.velocity.x = this.badGuysMovement.velocity))
    } else {
      this.badGuyGroupRTL.children.map(badguy => (badguy.body.velocity.x = -this.badGuysMovement.velocity))
    }
  }

  moveBadGuysLTR () {
    if (this.badGuysMovement.ltr) {
      this.badGuyGroupLTR.children.map(badguy => (badguy.body.velocity.x = -this.badGuysMovement.velocity))
    } else {
      this.badGuyGroupLTR.children.map(badguy => (badguy.body.velocity.x = this.badGuysMovement.velocity))
    }
  }

  moveHero () {
    // Get hero position on change of direction
    const getPosAtTurn = () => {
      // Send current hero data to allow trail to be built
      this.storeHeroHistory(this.hero.x, this.hero.y)
    }
    // If not reversed, turn normally
    if (!this.gameRules.reverseHero) {
      switch (this.direction) {
        case 'left':
          this.hero.body.velocity.x -= this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = this.heroStart.pivot
          this.heroEye.pivot.y = 0

          this.moveBadGuys('left')

          getPosAtTurn()
          break
        case 'right':
          this.hero.body.velocity.x += this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = -this.heroStart.pivot
          this.heroEye.pivot.y = 0

          this.moveBadGuys('right')

          getPosAtTurn()
          break
        case 'up':
          this.hero.body.velocity.y -= this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = 0
          this.heroEye.pivot.y = this.heroStart.pivot
          getPosAtTurn()
          break
        case 'down':
          this.hero.body.velocity.y += this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = 0
          this.heroEye.pivot.y = -this.heroStart.pivot
          getPosAtTurn()
          break
        default:
          break
      }
    // hero is reversed!
    } else {
      switch (this.direction) {
        case 'left':
          this.hero.body.velocity.x += this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = -this.heroStart.pivot
          this.heroEye.pivot.y = 0
          getPosAtTurn()
          break
        case 'right':
          this.hero.body.velocity.x -= this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = this.heroStart.pivot
          this.heroEye.pivot.y = 0
          getPosAtTurn()
          break
        case 'up':
          this.hero.body.velocity.y += this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = 0
          this.heroEye.pivot.y = -this.heroStart.pivot
          getPosAtTurn()
          break
        case 'down':
          this.hero.body.velocity.y -= this.gameRules.heroSpeedCurrent
          // Pivot eye
          this.heroEye.pivot.x = 0
          this.heroEye.pivot.y = this.heroStart.pivot
          getPosAtTurn()
          break
        default:
          break
      }
    }
  }

  // Constantly move the camera
  moveCamera () {
    // As long as the game is running and the hero has reaches a certain position...
    if (this.gameInPlay && this.hero.y >= this.gameRules.triggerCameraHeight) {
      this.camera.y += this.gameRules.gameSpeed
    }
  }

  // Handle Object Collision
  handleObjectCollision (hero, object) {
    let name = object.name
    let text
    let heroSpeed = this.gameRules.heroSpeedCurrent
    let bonusPoints = 0
    this.objects.collected += 1

    switch (name) {
      case 'bonus1':
        text = '+50 POINTS!'
        bonusPoints = 50
        break
      case 'bonus2':
        text = '+100 POINTS!'
        bonusPoints = 100
        break
      case '1up':
        text = '1 UP!'
        this.heroStart.lives += 1
        break
      case 'fast':
        heroSpeed = 200
        break
      case 'slow':
        heroSpeed = 100
        break

      default:
        break
    }

    // Handle the text update
    this.showHeroText(text, 400)

    // Add bonus to total
    this.bonusPoints += bonusPoints

    this.gameRules.heroSpeedCurrent = heroSpeed

    // Tiles to be reset for each death go here
    if (name === 'slow' || name === 'fast') {
      if (!this.speedTimerInMotion) {
        this.handleSpeedTimer(name)
      }
      // Add the touched tile to an array
      this.touchableObjects.push(object)
    } else {
      object.kill()
      // Else end of game reset tiles go here
      this.specialTouchableObjects.push(object)
    }
  }

  // Generic handler for all hover text
  showHeroText (textToDisplay, lifespan) {
    this.textInfo = this.add.text(this.hero.x + 8, this.hero.y - 10, textToDisplay, this.textStyle)
    this.textInfo.anchor.setTo(0.5) // set anchor to middle / center
    this.textInfo.lifespan = lifespan
  }

  // Generic handler for all hover text
  showHeroTextFollow (textToDisplay, lifespan) {
    this.textInfoFollow = this.add.text(0, 0, textToDisplay, this.textOverlayStyle)
    this.textInfoFollow.anchor.setTo(0.5) // set anchor to middle / center
    this.textInfoFollow.lifespan = lifespan
    this.textInfoFollow.x = this.centerX
    this.textInfoFollow.y = this.centerY
    this.textInfoFollow.fixedToCamera = true
  }

  handleSpeedTimer (speedType) {
    // Toggle speed timer allowence
    this.speedTimerInMotion = !this.speedTimerInMotion

    let speedText

    if (speedType === 'fast') {
      speedText = `Speeded for: `
    } else if (speedType === 'slow') {
      speedText = `Slowed for: `
    }

    // 'setTimeout' event for turning off player speed changes
    let setSpeedTimeout = this.time.events.add(Phaser.Timer.SECOND * this.gameRules.speedTimer, () => {
      this.gameRules.heroSpeedCurrent = 180
      this.time.events.remove(setSpeedTimeout)
    }, this)

    // Set initial counter length
    let totalTime = Phaser.Timer.SECOND * (this.gameRules.speedTimer)

    // Looped timer
    const updateCounter = () => {
      totalTime -= Phaser.Timer.SECOND

      // Show text
      this.showHeroTextFollow(speedText.concat(`${totalTime / Phaser.Timer.SECOND}s`), Phaser.Timer.SECOND)

      // If timed out, remove counter
      if (totalTime <= Phaser.Timer.SECOND) this.time.events.remove(this.textTimer)
    }

    // On collide, show this first, (to be replaced in the loop)
    this.showHeroTextFollow(speedText.concat(`${totalTime / Phaser.Timer.SECOND}s`), Phaser.Timer.SECOND)

    // https://phaser.io/examples/v2/time/custom-timer
    // Create looped timer
    this.textTimer = this.time.events.loop(Phaser.Timer.SECOND, updateCounter, this)
  }

  handleGameInPlay () {
    // if it bleeds we can kill it
    if (this.startPanelGroup) {
      this.startPanelGroup.kill()
    }

    if (this.gameTimer.running !== true || this.gameTimer.paused !== true) {
      this.gameTimer.start()
    } else if (this.gameTimer.paused) {
      this.gameTimer.resume()
    }

    // To move hero
    this.moveHero()
    this.moveCamera()
    this.moveBadGuys()
    this.moveBadGuysLTR()
    this.moveBadGuysRTL()

    // // Collide the hero and the stars with the walls
    this.physics.arcade.collide(this.hero, this.mapLayer, this.handleLossOfLife, null, this)

    // When the hero hits the edge of the screen
    this.hero.events.onOutOfBounds.add(this.handleLossOfLife, this)

    // When hero overlaps objects
    this.physics.arcade.overlap(this.hero, this.bonus1Group, this.handleObjectCollision, null, this)
    this.physics.arcade.overlap(this.hero, this.bonus2Group, this.handleObjectCollision, null, this)
    this.physics.arcade.overlap(this.hero, this.oneUpGroup, this.handleObjectCollision, null, this)
    this.physics.arcade.overlap(this.hero, this.slowDownGroup, this.handleObjectCollision, null, this)
    this.physics.arcade.overlap(this.hero, this.speedUpGroup, this.handleObjectCollision, null, this)
    this.physics.arcade.overlap(this.hero, this.badGuyGroup, this.handleLossOfLife, null, this)
    this.physics.arcade.overlap(this.hero, this.badGuyGroupRTL, this.handleLossOfLife, null, this)
    this.physics.arcade.overlap(this.hero, this.badGuyGroupLTR, this.handleLossOfLife, null, this)
    this.physics.arcade.overlap(this.hero, this.smallWallGroup, this.handleLossOfLife, null, this)

    // If hero is off screen
    if (this.hero.y <= this.game.camera.y + (this.heroSize / 2)) {
      this.handleLossOfLife()
    }
  }

  handleReset () {
    if (this.endGamePanelGroup) this.endGamePanelGroup.kill()
    if (this.endGameTextGroup) this.endGameTextGroup.kill()
    if (this.restartPanelBG) this.restartPanelBG.kill()
    if (this.resetPanelBG) this.resetPanelBG.kill()

    this.trail.destroy()

    this.badGuysMovement.velocity = 40

    this.direction = 'down'
    this.endGame = false
    this.gameRules.heroSpeedCurrent = this.gameRules.heroSpeedDefault
    this.gameRules.reverseHero = false
    this.heroColor.current = this.heroColor.default
    this.resetTouchableItems()

    // If it's game over...
    if (this.gameOver) {
      // Reset
      this.heroStart.lives = 1 // TODO get rid of hard-value
      this.livesLeft.text = `${this.heroStart.lives}`
      this.camera.y = 0
      this.heroStart.x = 196 // TODO get rid of hard-value
      this.heroStart.y = this.heroStart.originalY

      this.score = 0
      this.gameTime.total = 0
      this.objects.collected = 0

      this.bonusPoints = 0
      this.scoreText.text = `SCORE: ${this.score}`

      // Show top score panel
      this.add.tween(this.scorePanel.pivot).to({y: 0}, 300, Phaser.Easing.Circular.Out, true, 300)

      // Reset special tiles
      this.resetSpecialTouchableItems()
      // Put hero in position
      this.readyHeroOne()
    // Else, do things differently
    } else {
      this.hero.x = this.heroStart.x
      this.hero.y = this.heroStart.y
      this.camera.y = this.heroStart.y - (this.camera.height / 2 - 300)

      this.score = Math.floor(this.hero.y + this.bonusPoints) - this.heroStart.originalY
      this.scoreText.text = `SCORE: ${this.score}`

      // Put hero in position
      this.readyHeroOne()
    }
    // Reset gameOver value (after Game over happens)
    this.gameOver = false
  }

  readyHeroOne () {
    // Move hero into start position
    this.hero.x = this.heroStart.x
    this.hero.y = this.heroStart.y

    // Reset eyeball
    this.heroEye.pivot.x = 0
    this.heroEye.pivot.y = 0

    // Move bad guys too
    this.badGuyGroup.children.map(badguy => {
      badguy.body.velocity.x = 0
      badguy.x = (this.heroStart.x - 10)
    })

    // Move bad guys too
    this.badGuyGroupRTL.children.map(badguy => {
      badguy.body.velocity.x = 0
      badguy.x = (this.heroStart.x - 10)
    })

    // Move bad guys too
    this.badGuyGroupLTR.children.map(badguy => {
      badguy.body.velocity.x = 0
      badguy.x = (this.heroStart.x - 10)
    })

    // Tween hero in before starting...
    let tweenheroIn = this.add.tween(this.hero).from({alpha: 0}, 1000, Phaser.Easing.Linear.None, true, 200)
    this.add.tween(this.hero.pivot).from({x: 0, y: 100}, 1000, Phaser.Easing.Cubic.InOut, true, 200)

    tweenheroIn.onComplete.add(() => {
      // hero needs to be in position nefore starting
      this.heroStart.inPosition = true

      if (!this.gameInPlay) {
        this.startAgainInfo()
      }
    })
  }

  handleLossOfLife () {
    this.gameTimer.pause()
    this.heroStart.lives -= 1
    this.endGame = true
    this.direction = null
    this.gameInPlay = false
    this.heroStart.inPosition = false
    this.speedTimerInMotion = !this.speedTimerInMotion
    this.badGuysMovement.velocity = 0

    this.time.events.remove(this.textTimer)

    this.livesLeft.text = `${this.heroStart.lives}`

    this.showHeroText('OUCH', 1000)

    //  Reset the heros velocity (keyboardEvents)
    this.hero.body.velocity.x = 0
    this.hero.body.velocity.y = 0

    //  You can set your own intensity and duration
    this.camera.shake(0.01, 500)

    if (this.heroStart.lives !== 0) {
      this.resetPanelBG = this.add.graphics(this.centerX, this.centerY)
      this.resetPanelBG.beginFill(this.overlay.bgCol, 1)
      this.resetPanelBG.drawCircle(0, 0, 170)
      this.resetPanelBG.world.x = this.centerX
      this.resetPanelBG.world.y = this.centerY
      this.resetPanelBG.fixedToCamera = true
      this.resetPanelBG.anchor.set(0.5)
      this.resetPanelBG.alpha = 1
      this.resetPanelBG.scale.x = 1
      this.resetPanelBG.scale.y = 1

      this.resetInfo = this.add.text(0, 5, 'ENTER TO RESET', { font: this.style.font, fontSize: '15px', fill: this.overlay.textCol, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.resetInfo.anchor.setTo(0.5) // set anchor to middle / center

      this.resetPanelBG.addChild(this.resetInfo)

      this.add.tween(this.resetPanelBG.pivot).from({x: 500}, 500, Phaser.Easing.Elastic.Out, true)

      this.resetPanelBG.fixedToCamera = true
    } else {
      this.handleGameOver()
    }
  }

  handleGameOver () {
    // Destroy the timer
    this.gameTimer.destroy()

    // Create new game timer
    this.gameTimeBuilder()

    this.gameOver = true

    // Hide top score panel
    this.add.tween(this.scorePanel.pivot).to({y: 50}, 300, Phaser.Easing.Circular.Out, true)

    // Number of Game Over panels to over on game over
    this.endGamePanelsArray = [...Array(12).keys()]
    this.endGamePanelHeight = this.camera.height / this.endGamePanelsArray.length

    // Create group for panel
    this.endGamePanelGroup = this.add.group()
    this.endGamePanelGroup.fixedToCamera = true

    this.endGamePanelsArray.map((GOPanel, index) => {
      // Draw panel graphics
      GOPanel = this.add.graphics(0, 0)
      GOPanel.beginFill(this.overlay.bgCol, 1)
      // x, y, width, height
      GOPanel.drawRect(this.endGamePanelGroup.x, (this.endGamePanelHeight * index), this.camera.width, this.endGamePanelHeight)
      GOPanel.alpha = 0.8 + (0.02 * index)
      GOPanel.anchor.set(0.5)
      // Add to group
      this.endGamePanelGroup.add(GOPanel)
    })

    // Draw panel graphics
    let GOTextBgShape = this.add.graphics(0, 0)
    GOTextBgShape.beginFill(this.overlay.bgCol2, 1)
    GOTextBgShape.moveTo(-100, this.centerY - 150)
    GOTextBgShape.lineTo(this.centerX * 3, this.centerY)
    GOTextBgShape.lineTo(this.centerX - 50, this.centerY + 200)
    GOTextBgShape.endFill()
    GOTextBgShape.anchor.set(0.5)

    // Draw panel graphics
    let GOTextBgShape2 = this.add.graphics(0, 0)
    GOTextBgShape2.beginFill(this.overlay.bgCol3, 1)
    GOTextBgShape2.moveTo(this.centerY + 100, this.centerY - 200)
    GOTextBgShape2.lineTo(this.centerX, this.centerY + 200)
    GOTextBgShape2.lineTo(this.centerX - 200, this.centerY + 100)
    GOTextBgShape2.endFill()
    GOTextBgShape2.anchor.set(0.5)

    // Create Group for Text
    this.endGameTextGroup = this.add.group()
    this.endGameTextGroup.alpha = 0
    this.endGameTextGroup.fixedToCamera = true
    this.endGameTextGroup.add(GOTextBgShape2)
    this.endGameTextGroup.add(GOTextBgShape)

    // Set High Score (via a Promise)
    let setHighScore = new Promise((resolve, reject) => {
      // Set a hightScore localStorage variable if it hasn't already been set
      if (localStorage.getItem('highScore') === null) {
        localStorage.setItem('highScore', this.score)
        resolve(this.score)
      // If the new score is greater than the previous high score, store it
      } else if (this.score >= localStorage.getItem('highScore')) {
        localStorage.setItem('highScore', this.score)
        this.highScore = localStorage.highScore
        this.highScoreText.text = `HIGH: ${this.highScore}`
        resolve(this.score)
      } else {
        resolve(this.highScore)
      }
    })

    // Wrap inside a promise
    setHighScore.then(highScorePromise => {
      // Game over text
      this.gameOverInfo = this.add.text(this.centerX, this.centerY - 40, 'GAME OVER', { font: this.style.font, fontSize: '25px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.gameOverInfo.anchor.setTo(0.5) // set anchor to middle / center
      // Score
      this.scoreInfo = this.add.text(this.centerX, this.centerY - 5, `SCORE: ${this.score} `, { font: this.style.font, fontSize: '15px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.scoreInfo.anchor.setTo(0.5) // set anchor to middle / center
      // Time
      this.totalTimeInfo = this.add.text(this.centerX, this.centerY + 45, `TIME: ${this.msToTime(this.gameTime.total)}`, { font: this.style.font, fontSize: '12px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.totalTimeInfo.anchor.setTo(0.5) // set anchor to middle / center
      // Items Collected
      this.totalItemsInfo = this.add.text(this.centerX - 100, this.centerY + 45, `ITEMS: ${this.objects.collected}/${this.objects.count}`, { font: this.style.font, fontSize: '12px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.totalItemsInfo.anchor.setTo(0.5) // set anchor to middle / center
      // High Score
      this.highScoreInfo = this.add.text(this.centerX + 100, this.centerY + 45, `HIGH: ${highScorePromise}`, { font: this.style.font, fontSize: '12px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.highScoreInfo.anchor.setTo(0.5) // set anchor to middle / center
      // Restart info
      this.restartInfo = this.add.text(this.centerX, this.centerY + 80, 'ENTER TO RESET', { font: this.style.font, fontSize: '18px', fill: this.overlay.textCol2, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.restartInfo.anchor.setTo(0.5) // set anchor to middle / center
      // Add text to group
      this.endGameTextGroup.add(this.scoreInfo)
      this.endGameTextGroup.add(this.totalTimeInfo)
      this.endGameTextGroup.add(this.totalItemsInfo)
      this.endGameTextGroup.add(this.gameOverInfo)
      this.endGameTextGroup.add(this.highScoreInfo)
      this.endGameTextGroup.add(this.restartInfo)

      // Loop and apply tween to each panel
      this.endGamePanelGroup.children.map((GOPanel, index) => {
        this.add.tween(GOPanel).from({x: -this.camera.width}, 300, Phaser.Easing.Circular.Out, true, 100 * index)
      })

      this.add.tween(this.endGameTextGroup.pivot).from({x: -100}, 250, 'Linear', true, 500)
      this.add.tween(this.endGameTextGroup).to({alpha: 1}, 250, 'Linear', true, 500)
    }).catch(() => console.log('High Score Promise Error'))
  }

  msToTime (ms) {
    let dt = new Date(ms)
    let mins = dt.getMinutes()
    let secs = parseInt(dt.getSeconds(), 10)
    let millis = parseInt(dt.getMilliseconds(), 10)

    let tm = `${mins ? mins + 'm ' : ''}${secs}.${Math.ceil(millis / 100)}s`
    return tm
  }

  startAgainInfo () {
    this.startPanel3BG = this.add.graphics(this.centerX, this.centerY)
    this.startPanel3BG.beginFill(this.overlay.bgCol3, 1)
    this.startPanel3BG.drawCircle(0, 0, 170)
    this.startPanel3BG.pivot.x = -50
    this.startPanel3BG.world.x = this.centerX
    this.startPanel3BG.world.y = this.centerY
    this.startPanel3BG.fixedToCamera = true
    this.startPanel3BG.anchor.set(0.5)
    this.startPanel3BG.alpha = 0.95
    this.startPanel3BG.scale.x = 1
    this.startPanel3BG.scale.y = 1

    this.startPanel2BG = this.add.graphics(this.centerX, this.centerY)
    this.startPanel2BG.beginFill(this.overlay.bgCol2, 1)
    this.startPanel2BG.drawCircle(0, 0, 170)
    this.startPanel2BG.pivot.x = 50
    this.startPanel2BG.world.x = this.centerX
    this.startPanel2BG.world.y = this.centerY
    this.startPanel2BG.fixedToCamera = true
    this.startPanel2BG.anchor.set(0.5)
    this.startPanel2BG.alpha = 0.95
    this.startPanel2BG.scale.x = 1
    this.startPanel2BG.scale.y = 1

    this.startPanelBG = this.add.graphics(this.centerX, this.centerY)
    this.startPanelBG.beginFill(this.overlay.bgCol, 1)
    this.startPanelBG.drawCircle(0, 0, 170)
    this.startPanelBG.world.x = this.centerX
    this.startPanelBG.world.y = this.centerY
    this.startPanelBG.fixedToCamera = true
    this.startPanelBG.anchor.set(0.5)
    this.startPanelBG.alpha = 1
    this.startPanelBG.scale.x = 1
    this.startPanelBG.scale.y = 1

    this.startInfo = this.add.text(this.centerX, this.centerY + 5, 'SPACEBAR TO START', { font: this.style.font, fontSize: '15px', fill: this.overlay.textCol, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.startInfo.anchor.setTo(0.5) // set anchor to middle / center

    this.startPanelBG.addChild(this.startInfo)

    this.startPanelGroup = this.add.group()

    this.startPanelGroup.add(this.startPanel3BG)
    this.startPanelGroup.add(this.startPanel2BG)
    this.startPanelGroup.add(this.startPanelBG)
    this.startPanelGroup.add(this.startInfo)

    // Display Start Info
    this.add.tween(this.startPanelGroup.pivot).from({ x: 500 }, 500, Phaser.Easing.Circular.InOut, 500)

    // Animate while displayed
    let startTween1 = this.add.tween(this.startPanelBG.scale).to({ x: 1.1, y: 1.1 }, 500, Phaser.Easing.Circular.InOut, 500, 500).yoyo(true).loop(true)
    let startTween2 = this.add.tween(this.startPanel2BG.pivot).to({ x: -50 }, 500, Phaser.Easing.Circular.InOut, 500, 500).yoyo(true).loop(true)
    let startTween3 = this.add.tween(this.startPanel3BG.pivot).to({ x: 50 }, 500, Phaser.Easing.Circular.InOut, 500, 500).yoyo(true).loop(true)

    startTween1.chain(startTween2, startTween3)
    startTween1.start()
  }

  // Create 1 Up items from map objects
  oneUpBuilder () {
    this.oneUpGroup = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, '1up', this.objects.spritesheet, 4, true, false, this.oneUpGroup)
  }

  // Create Small Walls items from map objects
  smallWallBuilder () {
    this.smallWallGroup = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'smallWall', this.objects.spritesheet, 5, true, false, this.smallWallGroup)
  }

  // Create Bonus 2 items from map objects
  bonus1Builder () {
    this.bonus1Group = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'bonus1', this.objects.spritesheet, 0, true, false, this.bonus1Group)
  }

  // Create Bonus 2 items from map objects
  bonus2Builder () {
    this.bonus2Group = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'bonus2', this.objects.spritesheet, 3, true, false, this.bonus2Group)
  }

  // Create Slow Down items from map objects
  slowDownBuilder () {
    this.slowDownGroup = this.add.physicsGroup()
    this.slowDownGroup.alpha = 0.5
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'slow', this.objects.spritesheet, 1, true, false, this.slowDownGroup)
  }

  // Create Speed Up items from map objects
  speedUpBuilder () {
    this.speedUpGroup = this.add.physicsGroup()
    this.slowDownGroup.alpha = 0.5
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'fast', this.objects.spritesheet, 2, true, false, this.speedUpGroup)
  }

  // Bad guy builder
  badGuyBuilder () {
    this.badGuyGroup = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'badguy', this.objects.spritesheet, 6, true, false, this.badGuyGroup)
    this.badGuyGroup.children.map(badguy => (badguy.body.enable = true))
  }

  // Bad guy builder
  badGuyBuilderRTL () {
    this.badGuyGroupRTL = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'badguy_rtl', this.objects.spritesheet, 6, true, false, this.badGuyGroupRTL)
    this.badGuyGroupRTL.children.map(badguy => (badguy.body.enable = true))
  }

  // Bad guy builder
  badGuyBuilderLTR () {
    this.badGuyGroupLTR = this.add.physicsGroup()
    // name, gid, key, frame, exists, autoCull, group, CustomClass, adjustY
    this.tileMap.createFromObjects(this.objects.layer, 'badguy_ltr', this.objects.spritesheet, 6, true, false, this.badGuyGroupLTR)
    this.badGuyGroupLTR.children.map(badguy => (badguy.body.enable = true))
  }

  gameTimeBuilder () {
    const updateTime = () => {
      this.gameTime.total += 100
    }
    //  Create our Timer
    //  It won't start automatically, allowing you to hook it to button events and the like.
    this.gameTimer = this.game.time.create(false)
    this.gameTimer.loop(100, updateTime, this)
  }

  updateScore () {
    this.score = Math.floor(this.hero.y + this.bonusPoints) - this.heroStart.originalY
    this.scoreText.text = `SCORE: ${this.score}`
    this.livesLeft.text = `${this.heroStart.lives}`
    this.highScoreText.text = `HIGH: ${localStorage.highScore || 0}`
  }

  updateScorePanel () {
    this.scoreText = this.add.text(10, 10, `SCORE: ${this.score}`, {font: this.style.font, fontSize: '12px', fill: this.panel.textCol})
    this.livesLeft = this.add.text(this.centerX, 19, `${this.heroStart.lives}`, {font: this.style.font, fontSize: '11px', fill: '#fff', align: 'center', boundsAlignH: 'center'})
    this.livesLeft.anchor.setTo(0.5)
    this.highScoreText = this.add.text(0, 10, `HIGH: ${localStorage.highScore || 0}`, { font: this.style.font, fontSize: '12px', fill: this.panel.textCol, align: 'right', boundsAlignH: 'right', wordWrapWidth: 20 })
    this.highScoreText.setTextBounds(0, 0, this.camera.width - 10, 0)

    this.scorePanel.add(this.scoreText)
    this.scorePanel.add(this.livesLeft)
    this.scorePanel.add(this.highScoreText)

    // Show top score panel
    this.add.tween(this.scorePanel.pivot).from({y: 50}, 300, Phaser.Easing.Circular.Out, true, 300)
  }

  // CREATE THE THINGS
  create () {
    //  We're going to be using physics, so enable the Arcade Physics system
    this.physics.startSystem(Phaser.Physics.ARCADE)

    this.centerX = this.camera.width / 2
    this.centerY = this.camera.height / 2

    this.wallBuilder()
    this.goalInfo = this.add.text(130, 85, 'REACH THE CHECKPOINT', { font: this.style.font, fontSize: '12px', fill: 'rgba(0, 0, 0, 0.25)', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.heroGroup = this.add.group()
    this.heroBuilder()
    this.tunnelGroup = this.add.group()

    this.oneUpGroup = this.add.group()
    this.bonus1Group = this.add.group()
    this.bonus2Group = this.add.group()

    this.gameTimeBuilder()
    this.smallWallBuilder()

    this.bonus1Builder()
    this.bonus2Builder()
    this.oneUpBuilder()

    this.slowDownBuilder()
    this.speedUpBuilder()

    this.badGuyBuilder()
    this.badGuyBuilderLTR()
    this.badGuyBuilderRTL()

    this.scorePanelBuilder()
    this.updateScorePanel()
    this.readyHeroOne()

    // Count items
    this.objects.count = (this.bonus1Group.children.length + this.bonus1Group.children.length + this.oneUpGroup.children.length)
    console.log(`Objects to collect: ${this.objects.count}`)

  }

  update () {
    this.spacebar = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
    this.enter = this.input.keyboard.addKey(Phaser.Keyboard.ENTER)
    this.enterNumpad = this.input.keyboard.addKey(Phaser.Keyboard.NUMPAD_ENTER)

    // Things that move even after bad as stopped
    this.physics.arcade.collide(this.badGuyGroup, this.mapLayer, null, null, this)
    this.physics.arcade.collide(this.badGuyGroupRTL, this.mapLayer, () => (this.badGuysMovement.rtl = !this.badGuysMovement.rtl), null, this)
    this.physics.arcade.collide(this.badGuyGroupLTR, this.mapLayer, () => (this.badGuysMovement.ltr = !this.badGuysMovement.ltr), null, this)

    // If we're not already playing, and not in the game over phase, and the hero is in position, and the spacebar is pressed... *phew*
    if (!this.gameInPlay && !this.endGame && this.heroStart.inPosition && this.spacebar.isDown) {
      this.gameInPlay = true
    }

    // Only update score if hero is in position
    if (this.hero.y >= this.heroStart.y + 5) {
      this.updateScore()
    }

    if (this.gameInPlay) {
      this.keyboardEvents()
      this.handleGameInPlay()
    }

    // Handle reset
    if ((this.endGame && this.enter.isDown) || (this.endGame && this.enterNumpad.isDown)) {
      this.handleReset()
    }

    // Handle z order
    this.game.world.sendToBack(this.heroGroup)
    this.game.world.bringToTop(this.tunnelGroup)
  }

  render () {
    if (__DEV__) {
      //this.game.debug.text(`Time elapsed: ${this.msToTime(this.gameTime.total)}`, 100, 100)
      // this.game.debug.cameraInfo(this.camera, 32, 32)
      // this.game.debug.spriteCoords(this.hero, 32, 500)
      //this.game.debug.body(this.hero)
    }
  }
}
