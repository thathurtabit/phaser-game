/* globals __DEV__ */
import Phaser from 'phaser'

export default class extends Phaser.State {
  constructor () {
    super()
    this.style = {
      font: 'Raleway'
    }
    this.score = 0
    this.gameInPlay = false
    this.endGame = false
    this.getNewStartTime = true
    this.gameOver = false
    this.direction = 'down'
    this.gameStartText = this.gameStartText
    this.heroSize = 14
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
      height: 25
    }
    this.panel = {
      bgCol: 0xffd670,
      textCol: 0x2D3A44
    }
    this.overlay = {
      bgColHex: '#8777f9',
      bgCol: 0x8777f9,
      textCol: '#ffffff'
    }
    this.heroColor = {
      current: 0xFF7F66,
      default: 0x8777f9,
      slow: 0xFF0000,
      fast: 0xFFFFFF,
      trail: 0xFF7F66
    }
    this.heroStart = {
      x: 198,
      y: 50,
      inPosition: false,
      lives: 3,
      pivot: 6
    }
    this.gameRules = {
      gameSpeed: 1,
      heroSpeedDefault: 180,
      heroSpeedFast: 200,
      heroSpeedSlow: 160,
      heroSpeedCurrent: 180,
      triggerCameraHeight: 250,
      reversehero: false
    }
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
    // this.tileMap.setTileIndexCallback(1, this.handleTileCollision, this)
    this.tileMap.setTileIndexCallback(2, this.handleTileCollision, this)
    // this.tileMap.setTileIndexCallback(3, this.handleTileCollision, this)
    // this.tileMap.setTileIndexCallback(4, this.handleTileCollision, this)
    //this.tileMap.setTileIndexCallback(3, this.handleTileCollision, this)
    this.tileMap.setTileIndexCallback(3, this.reversehero, this)
    this.tileMap.setTileIndexCallback(4, this.handleCheckpoint, this)

    // Collision
    this.tileMap.setCollisionByExclusion([2, 4])
  }

  handleTileCollision (sprite, tile) {
    let index = tile.index
    let text
    let heroSpeed = this.gameRules.heroSpeedCurrent
    let bonusPoints = 0
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

    // When we hit the tile, do things only once...
    if (tile.alpha === 1) {
      this.pointInfo = this.add.text(this.hero.x, this.hero.y, text, { font: this.style.font, fontSize: '10px', fill: '#FFF', backgroundColor: 'rgba(0, 0, 0, 0.9)', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      // Add bonus to total
      this.bonusPoints += bonusPoints
    }

    this.pointInfo.anchor.setTo(0.5) // set anchor to middle / center
    this.pointInfo.lifespan = 400

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

  reversehero (sprite, tile) {
    this.gameRules.reversehero = true
    tile.alpha = 0.2
    // Add the touched tile to an array
    this.touchableTiles.push(tile)
  }

  handleCheckpoint (sprite, tile) {
    // When we hit the tile, do things only once...
    if (tile.alpha === 1) {
      this.pointInfo = this.add.text(this.hero.x, this.hero.y, 'CHECKPOINT!', { font: this.style.font, fontSize: '12px', fill: '#333', backgroundColor: '#62e79e', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
      this.pointInfo.anchor.setTo(0.5) // set anchor to middle / center
    }
    this.pointInfo.lifespan = 400
    tile.alpha = 0.2
    this.mapLayer.dirty = true

    this.heroStart.x = (tile.worldX + this.tile.width / 2) - this.heroSize / 2
    this.heroStart.y = (tile.worldY + this.tile.height / 2) - this.heroSize / 2

    // Add the SPECIAL touched tile to an array - reset only on GAME OVER
    this.specialTouchableTiles.push(tile)
  }

  // Store Hero History
  storeHeroHistory (xPos, yPos) {
    let x = xPos + (this.heroSize / 2) - 2
    let y = yPos + (this.heroSize / 2) - 2

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

    //  We need to enable physics on the hero
    this.physics.arcade.enable(this.hero)

    this.hero.body.collideWorldBounds = true
    this.hero.checkWorldBounds = true

    if (this.hero.inCamera === false && this.gameInPlay) {
      this.handleLossOfLife()
    }

    this.add.tween(this.hero).to({ y: 50 }, 500, Phaser.Easing.Back.Out, true, 1000)

    this.heroGroup.add(this.hero)
  }

  scorePanelBuilder () {
    this.scorePanel = this.add.group()
    this.scorePanel.width = this.camera.width
    this.scorePanel.fixedToCamera = true

    let scoreBg = this.add.graphics(0, 0)
    scoreBg.beginFill(this.panel.bgCol, 1)
    scoreBg.drawRect(0, 0, this.camera.width, 30)

    // use the bitmap data as the texture for the sprite
    this.scorePanel.add(scoreBg)
  }

  // Movement events
  keyboardEvents () {
    this.cursors = this.input.keyboard.createCursorKeys()

    // Reset the reversing back to normal
    const resetReverse = () => {
      this.gameRules.reversehero = false
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
      this.badGuyGroup.children.map(badguy => (badguy.body.velocity.x = (this.hero.x + this.hero.body.velocity.x)))
    } else if (direction === 'right') {
      this.badGuyGroup.children.map(badguy => (badguy.body.velocity.x = (this.hero.x - this.hero.body.velocity.x)))
    }
  }

  moveHero () {
    // Get hero position on change of direction
    const getPosAtTurn = () => {
      // Send current hero data to allow trail to be built
      this.storeHeroHistory(this.hero.x, this.hero.y)
    }
    // If not reversed, turn normally
    if (!this.gameRules.reversehero) {
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
        text = 'SPEED UP'
        heroSpeed = 200
        break
      case 'slow':
        text = 'SLOW DOWN'
        heroSpeed = 100
        break

      default:
        break
    }

    this.pointInfo = this.add.text(this.hero.x, this.hero.y, text, { font: this.style.font, fontSize: '10px', fill: '#FFF', backgroundColor: 'rgba(0, 0, 0, 0.5)', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    // Add bonus to total
    this.bonusPoints += bonusPoints

    this.pointInfo.anchor.setTo(0.5) // set anchor to middle / center
    this.pointInfo.lifespan = 400

    this.gameRules.heroSpeedCurrent = heroSpeed

    // Tiles to be reset for each death go here
    if (name === 'slow' || name === 'fast') {
      // Add the touched tile to an array
      this.touchableObjects.push(object)
    } else {
      object.kill()
      // Else end of game reset tiles go here
      this.specialTouchableObjects.push(object)
    }
  }

  handleGameInPlay () {
    this.startInfo.kill()
    // if it bleeds we can kill it
    if (this.startPanelBG) {
      this.startPanelBG.kill()
    }
    // Only required once per loop to generate total time
    if (this.getNewStartTime) {
      this.startTime = Date.now()
    }
    this.getNewStartTime = false

    // To move hero
    this.moveHero()
    this.moveCamera()
    this.moveBadGuys()

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
    this.physics.arcade.overlap(this.hero, this.smallWallGroup, this.handleLossOfLife, null, this)

    // If hero is off screen
    if (this.hero.y <= this.game.camera.y + (this.heroSize / 2)) {
      this.handleLossOfLife()
    }
  }

  handleReset () {
    if (this.endGamePanel) this.endGamePanel.kill()
    if (this.restartInfo) this.restartInfo.kill()

    this.trail.destroy()
    this.score = 0
    this.scoreText.text = `SCORE: ${this.score}`

    this.direction = 'down'
    this.endGame = false
    this.bonusPoints = 0
    this.gameRules.heroSpeedCurrent = this.gameRules.heroSpeedDefault
    this.gameRules.reversehero = false
    this.heroColor.current = this.heroColor.default
    this.resetTouchableItems()

    // If it's game over...
    if (this.gameOver) {
      // Reset
      this.heroStart.lives = 3
      this.livesLeft.text = `Lives: ${this.heroStart.lives}`
      this.camera.y = 0
      this.heroStart.x = 198 // TODO get rid of hard-value
      this.heroStart.y = 50 // TODO get rid of hard-value
      // Reset special tiles
      this.resetSpecialTouchableItems()
      // Put hero in position
      this.readyheroOne()
    // Else, do things differently
    } else {
      this.hero.x = this.heroStart.x
      this.hero.y = this.heroStart.y
      this.camera.y = this.heroStart.y - (this.camera.height / 2 - 100)
      // Put hero in position
      this.readyheroOne()
    }
    // Reset gameOver value (after Game over happens)
    this.gameOver = false
  }

  readyheroOne () {
    // Move hero into start position
    this.hero.x = this.heroStart.x
    this.hero.y = this.heroStart.y

    // Move bad guys too
    this.badGuyGroup.children.map(badguy => {
      badguy.body.velocity.x = 0
      badguy.x = (this.heroStart.x - 10)
    })

    // Tween hero in before starting...
    let tweenheroIn = this.add.tween(this.hero).from({y: 0}, 500, Phaser.Easing.Back.Out, true, 500)
    tweenheroIn.onComplete.add(() => {
      // hero needs to be in position nefore starting
      this.heroStart.inPosition = true

      if (!this.gameInPlay) {
        this.startAgainInfo()
      }
    })
  }

  handleLossOfLife () {
    this.heroStart.lives -= 1
    this.endGame = true
    this.direction = null
    this.gameInPlay = false
    this.heroStart.inPosition = false

    this.livesLeft.text = `Lives: ${this.heroStart.lives}`

    this.heroInfo = this.add.text(this.hero.x + 7, this.hero.y - 15, 'OUCH', { font: this.style.font, fontSize: '10px', fill: '#FFF', backgroundColor: 'rgba(0, 0, 0, 0.5)', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.heroInfo.anchor.setTo(0.5) // set anchor to middle / center
    // Kill off after this time...
    this.heroInfo.lifespan = 1000

    //  Reset the heros velocity (keyboardEvents)
    this.hero.body.velocity.x = 0
    this.hero.body.velocity.y = 0

    //  You can set your own intensity and duration
    this.camera.shake(0.01, 500)

    // Restart info
    this.restartInfo = this.add.text(this.centerX, this.centerY, 'ENTER TO RESTART', { font: this.style.font, fontSize: '20px', fill: this.overlay.textCol, backgroundColor: this.overlay.bgColHex, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.restartInfo.anchor.setTo(0.5) // set anchor to middle / center
    this.restartInfo.fixedToCamera = true

    if (this.heroStart.lives === 0) {
      this.handleGameOver()
    }
  }

  handleGameOver () {
    this.gameOver = true
    this.restartInfo.kill()

    // Create Group for Info
    this.endGamePanel = this.add.group()
    this.endGamePanel.alpha = 0
    this.endGamePanel.width = this.camera.width - 30
    this.endGamePanel.fixedToCamera = true

    this.endGameBG = this.add.graphics(0, 0)
    this.endGameBG.beginFill(this.heroColor.current, 1)
    this.endGameBG.drawRect(35, (this.camera.height / 2) - 85, this.camera.width - 80, 170)
    this.endGameBG.anchor.set(0.5, 0.5)

    // use the bitmap data as the texture for the sprite
    this.endGamePanel.add(this.endGameBG)

    // Get play time
    this.totalTime = this.msToTime(Date.now() - this.startTime)
    this.getNewStartTime = true

    // Game over text
    this.gameOverInfo = this.add.text(this.centerX, this.centerY - 40, 'GAME OVER', { font: this.style.font, fontSize: '25px', fill: '#FFF', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.gameOverInfo.anchor.setTo(0.5) // set anchor to middle / center
    // Score
    this.scoreInfo = this.add.text(this.centerX, this.centerY - 5, `Score: ${this.score} `, { font: this.style.font, fontSize: '15px', fill: '#FFF', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.scoreInfo.anchor.setTo(0.5) // set anchor to middle / center
    // Time
    this.totalTimeInfo = this.add.text(this.centerX, this.centerY + 22, `Time: ${this.totalTime} `, { font: this.style.font, fontSize: '15px', fill: '#FFF', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.totalTimeInfo.anchor.setTo(0.5) // set anchor to middle / center
    // Restart info
    this.restartInfo = this.add.text(this.centerX, this.centerY + 50, 'Press ENTER to reset', { font: this.style.font, backgroundColor: 'rgba(0, 0, 0, 0.2)', fontSize: '12px', fill: '#FFF', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.restartInfo.anchor.setTo(0.5) // set anchor to middle / center
    // Add text to group
    this.endGamePanel.add(this.scoreInfo)
    this.endGamePanel.add(this.totalTimeInfo)
    this.endGamePanel.add(this.gameOverInfo)
    this.endGamePanel.add(this.restartInfo)

    this.add.tween(this.endGamePanel).to({alpha: 1}, 250, 'Linear', true)

    this.setHighScore()
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

    // Reset eyeball
    this.heroEye.pivot.x = 0
    this.heroEye.pivot.y = 0

    this.startInfo = this.add.text(0, 5, 'SPACEBAR TO START', { font: this.style.font, fontSize: '15px', fill: this.overlay.textCol, align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' })
    this.startInfo.anchor.setTo(0.5) // set anchor to middle / center

    this.startPanelBG.addChild(this.startInfo)

    this.score = 0
    let startTween1 = this.add.tween(this.startPanelBG).from({ alpha: 0 }, 1000, 'Linear')
    let startTween2 = this.add.tween(this.startPanelBG.scale).to({ x: 1.05, y: 1.05 }, 500, Phaser.Easing.Circular.InOut, 500, 1000).yoyo(true).loop(true)

    startTween1.chain(startTween2)
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
    console.log(this.badGuyGroup.children)
  }

  updateScore () {
    this.score = Math.floor(this.hero.y - this.heroStart.y) + this.bonusPoints
    this.scoreText.text = `SCORE: ${this.score}`
    this.livesLeft.text = `LIVES: ${this.heroStart.lives}`
    this.highScoreText.text = `HIGH: ${localStorage.highScore || 0}`
  }

  scoreText () {
    this.scoreText = this.add.text(10, 8, 'SCORE: 0', {font: this.style.font, fontSize: '12px', fill: this.panel.textCol})
    this.livesLeft = this.add.text(178, 8, `LIVES: ${this.heroStart.lives}`, {font: this.style.font, fontSize: '12px', fill: this.panel.textCol, align: 'center', boundsAlignH: 'center'})
    this.highScoreText = this.add.text(0, 8, `HIGH: ${localStorage.highScore || 0}`, { font: this.style.font, fontSize: '12px', fill: this.panel.textCol, align: 'right', boundsAlignH: 'right', wordWrapWidth: 20 })
    this.highScoreText.setTextBounds(0, 0, this.camera.width - 10, 0)

    this.scorePanel.add(this.scoreText)
    this.scorePanel.add(this.livesLeft)
    this.scorePanel.add(this.highScoreText)
  }

  setHighScore () {
    this.startTime = 0
    // Set a hightScore localStorage variable if it hasn't already been set
    if (localStorage.getItem('highScore') === null) {
      localStorage.setItem('highScore', this.score)
    // If the new score is greater than the previous high score, store it
    } else if (this.score > localStorage.getItem('highScore')) {
      localStorage.setItem('highScore', this.score)
      this.highScore = localStorage.highScore
      this.highScoreText.text = `HIGH: ${this.highScore}`
    }
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

    this.smallWallBuilder()
    this.bonus1Builder()
    this.bonus2Builder()
    this.oneUpBuilder()
    this.slowDownBuilder()
    this.speedUpBuilder()
    this.badGuyBuilder()

    this.scorePanelBuilder()
    this.scoreText()
    this.readyheroOne()
  }

  update () {
    this.spacebar = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
    this.enter = this.input.keyboard.addKey(Phaser.Keyboard.ENTER)
    this.enterNumpad = this.input.keyboard.addKey(Phaser.Keyboard.NUMPAD_ENTER)

    // Things that move even after bad as stopped
    this.physics.arcade.collide(this.badGuyGroup, this.mapLayer, null, null, this)

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
      // this.game.debug.cameraInfo(this.camera, 32, 32)
      // this.game.debug.spriteCoords(this.hero, 32, 500)
    }
  }
}
