package com.example

import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.delay
import kotlin.math.*

// ==========================================
// DATA MODELS
// ==========================================
enum class ScreenState { MENU, GAME, SUMMARY }
enum class MenuTab { PLAY, WEAPONS, ARENAS, SETTINGS }

data class CareerStats(
    val kills: Int = 0,
    val deaths: Int = 0,
    val wins: Int = 0,
    val losses: Int = 0,
) {
    val kdRatio: String get() = if (deaths == 0) String.format(java.util.Locale.US, "%.2f", kills.toFloat()) else String.format(java.util.Locale.US, "%.2f", kills.toFloat() / deaths)
    val wlRatio: String get() = if (losses == 0) String.format(java.util.Locale.US, "%.2f", wins.toFloat()) else String.format(java.util.Locale.US, "%.2f", wins.toFloat() / losses)
}

data class Weapon(
    val id: String,
    val name: String,
    val icon: String,
    val category: String,
    val damage: Float,
    val fireRateMs: Long,
    val speed: Float,
    val spread: Float,
    val pellets: Int,
    val color: Color,
    val desc: String,
)

data class Wall(val x: Float, val y: Float, val w: Float, val h: Float)

data class Arena(
    val id: String,
    val name: String,
    val desc: String,
    val width: Float,
    val height: Float,
    val floorColor: Color,
    val wallColor: Color,
    val wallGlow: Color,
    val walls: List<Wall>,
    val spawns: List<Offset>,
)

class CombatantState(
    val id: String,
    var name: String,
    val isLocal: Boolean,
    val isBot: Boolean,
    var color: Color,
    var x: Float,
    var y: Float,
    var angle: Float = 0f,
    var vx: Float = 0f,
    var vy: Float = 0f,
    val speed: Float = 4.5f,
    val radius: Float = 20f,
    var hp: Float = 100f,
    val maxHp: Float = 100f,
    var weapon: Weapon,
    var kills: Int = 0,
    var deaths: Int = 0,
    var isDead: Boolean = false,
    var respawnTimer: Float = 0f,
    var invulnTimer: Float = 0f,
    var botTarget: CombatantState? = null,
    var botDecisionTimer: Float = 0f,
)

data class BulletState(
    var x: Float,
    var y: Float,
    val vx: Float,
    val vy: Float,
    val damage: Float,
    val maxRange: Float,
    var traveled: Float = 0f,
    val radius: Float = 4f,
    val color: Color,
    val shooterId: String,
    var despawned: Boolean = false,
)

data class ParticleState(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    var life: Float,
    val maxLife: Float,
    val size: Float,
    val color: Color,
)

data class KillFeedItem(
    val id: Long,
    val killer: String,
    val victim: String,
    val weapon: String,
)

// ==========================================
// PRESET WEAPONS & ARENAS
// ==========================================
val WEAPON_PISTOL = Weapon(
    id = "pistol",
    name = "P-9 TACTICAL",
    icon = "🔫",
    category = "Sidearm",
    damage = 25f,
    fireRateMs = 260L,
    speed = 16f,
    spread = 0.03f,
    pellets = 1,
    color = Color(0xFF00E5FF),
    desc = "Semi-auto precision sidearm with tight grouping."
)

val WEAPON_SMG = Weapon(
    id = "smg",
    name = "CYCLONE SMG",
    icon = "⚡",
    category = "Rapid Fire",
    damage = 15f,
    fireRateMs = 110L,
    speed = 17f,
    spread = 0.12f,
    pellets = 1,
    color = Color(0xFFFFEA00),
    desc = "High fire-rate submachine gun for close quarters."
)

val WEAPON_SHOTGUN = Weapon(
    id = "shotgun",
    name = "BREACHER 12G",
    icon = "💥",
    category = "Scattershot",
    damage = 16f,
    fireRateMs = 700L,
    speed = 14f,
    spread = 0.28f,
    pellets = 6,
    color = Color(0xFFFF5722),
    desc = "Lethal 6-pellet buckshot spread with heavy impact."
)

val WEAPON_DMR = Weapon(
    id = "dmr",
    name = "MARKSMAN DMR",
    icon = "🎯",
    category = "High Impact",
    damage = 55f,
    fireRateMs = 600L,
    speed = 22f,
    spread = 0.01f,
    pellets = 1,
    color = Color(0xFF76FF03),
    desc = "Heavy sniper rifle with high projectile velocity."
)

val ALL_WEAPONS = listOf(WEAPON_PISTOL, WEAPON_SMG, WEAPON_SHOTGUN, WEAPON_DMR)

val ARENA_COMPOUND = Arena(
    id = "compound",
    name = "THE COMPOUND",
    desc = "Tactical warehouse with cargo crates and concrete pillars.",
    width = 1600f,
    height = 1200f,
    floorColor = Color(0xFF0B111E),
    wallColor = Color(0xFF1D2A44),
    wallGlow = Color(0xFF00E5FF),
    spawns = listOf(
        Offset(160f, 160f),
        Offset(1440f, 160f),
        Offset(160f, 1040f),
        Offset(1440f, 1040f),
        Offset(800f, 600f)
    ),
    walls = listOf(
        Wall(0f, 0f, 1600f, 24f),
        Wall(0f, 1176f, 1600f, 24f),
        Wall(0f, 0f, 24f, 1200f),
        Wall(1576f, 0f, 24f, 1200f),
        Wall(740f, 520f, 120f, 160f),
        Wall(320f, 280f, 160f, 40f),
        Wall(1120f, 280f, 160f, 40f),
        Wall(320f, 880f, 160f, 40f),
        Wall(1120f, 880f, 160f, 40f)
    )
)

val ARENA_CITADEL = Arena(
    id = "citadel",
    name = "NEON CITADEL",
    desc = "Cybernetic combat plaza with energized flank barriers.",
    width = 1800f,
    height = 1300f,
    floorColor = Color(0xFF0A0D16),
    wallColor = Color(0xFF251528),
    wallGlow = Color(0xFFFF0055),
    spawns = listOf(
        Offset(200f, 650f),
        Offset(1600f, 650f),
        Offset(900f, 200f),
        Offset(900f, 1100f)
    ),
    walls = listOf(
        Wall(0f, 0f, 1800f, 24f),
        Wall(0f, 1276f, 1800f, 24f),
        Wall(0f, 0f, 24f, 1300f),
        Wall(1776f, 0f, 24f, 1300f),
        Wall(840f, 460f, 120f, 40f),
        Wall(840f, 800f, 120f, 40f),
        Wall(400f, 400f, 40f, 500f),
        Wall(1360f, 400f, 40f, 500f)
    )
)

val ALL_ARENAS = listOf(ARENA_COMPOUND, ARENA_CITADEL)

// ==========================================
// MAIN ACTIVITY
// ==========================================
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        insetsController.hide(WindowInsetsCompat.Type.systemBars())

        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF070B12)
                ) {
                    GameRootScreen()
                }
            }
        }
    }
}

// ==========================================
// GAME ROOT COMPOSABLE
// ==========================================
@Composable
fun GameRootScreen() {
    var screen by remember { mutableStateOf(ScreenState.MENU) }
    var currentTab by remember { mutableStateOf(MenuTab.PLAY) }
    var playerName by remember { mutableStateOf("VIPER-7") }
    var selectedWeapon by remember { mutableStateOf(WEAPON_PISTOL) }
    var selectedArena by remember { mutableStateOf(ARENA_COMPOUND) }
    var botCount by remember { mutableIntStateOf(2) }
    var botDiff by remember { mutableStateOf("VETERAN") }
    var targetKills by remember { mutableIntStateOf(10) }
    var suitColor by remember { mutableStateOf(Color(0xFF00E5FF)) }

    // Persistent Local Career Stats
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("apex_career_prefs", Context.MODE_PRIVATE) }
    var careerStats by remember {
        mutableStateOf(
            CareerStats(
                kills = prefs.getInt("career_kills", 0),
                deaths = prefs.getInt("career_deaths", 0),
                wins = prefs.getInt("career_wins", 0),
                losses = prefs.getInt("career_losses", 0)
            )
        )
    }

    // Game state objects
    val combatants = remember { mutableStateListOf<CombatantState>() }
    val bullets = remember { mutableStateListOf<BulletState>() }
    val particles = remember { mutableStateListOf<ParticleState>() }
    val killFeed = remember { mutableStateListOf<KillFeedItem>() }
    var isPaused by remember { mutableStateOf(false) }

    fun recordMatchOutcome(winner: CombatantState?) {
        val localP = combatants.find { it.isLocal } ?: return
        val isWin = winner?.isLocal == true
        val newKills = careerStats.kills + localP.kills
        val newDeaths = careerStats.deaths + localP.deaths
        val newWins = careerStats.wins + if (isWin) 1 else 0
        val newLosses = careerStats.losses + if (!isWin) 1 else 0
        careerStats = CareerStats(newKills, newDeaths, newWins, newLosses)
        prefs.edit()
            .putInt("career_kills", newKills)
            .putInt("career_deaths", newDeaths)
            .putInt("career_wins", newWins)
            .putInt("career_losses", newLosses)
            .apply()
    }

    fun resetCareerStats() {
        careerStats = CareerStats(0, 0, 0, 0)
        prefs.edit().clear().apply()
    }

    // Joysticks
    var moveVector by remember { mutableStateOf(Offset.Zero) }
    var aimAngle by remember { mutableFloatStateOf(0f) }
    var isShooting by remember { mutableStateOf(false) }
    var lastShotTime by remember { mutableLongStateOf(0L) }

    // Start Solo Game
    fun startGame() {
        combatants.clear()
        bullets.clear()
        particles.clear()
        killFeed.clear()
        isPaused = false

        // Local Player
        val pSpawn = selectedArena.spawns.first()
        val localP = CombatantState(
            id = "player",
            name = playerName,
            isLocal = true,
            isBot = false,
            color = suitColor,
            x = pSpawn.x,
            y = pSpawn.y,
            weapon = selectedWeapon
        )
        combatants.add(localP)

        // Bots
        val botNames = listOf("OMEGA-1", "TITAN-X", "PHANTOM", "CYBORG-9", "BLITZ")
        val botColors = listOf(Color(0xFFFF0055), Color(0xFFFFB700), Color(0xFFB026FF), Color(0xFF00FF66))
        for (i in 0 until botCount) {
            val spawn = selectedArena.spawns[(i + 1) % selectedArena.spawns.size]
            val b = CombatantState(
                id = "bot_$i",
                name = botNames[i % botNames.size],
                isLocal = false,
                isBot = true,
                color = botColors[i % botColors.size],
                x = spawn.x,
                y = spawn.y,
                weapon = ALL_WEAPONS[i % ALL_WEAPONS.size]
            )
            combatants.add(b)
        }

        screen = ScreenState.GAME
    }

    BackHandler(enabled = screen != ScreenState.MENU) {
        if (screen == ScreenState.GAME) {
            isPaused = !isPaused
        } else {
            screen = ScreenState.MENU
        }
    }

    // Active Game Loop
    LaunchedEffect(screen, isPaused) {
        if (screen != ScreenState.GAME || isPaused) return@LaunchedEffect
        var lastTime = System.nanoTime()

        while (true) {
            val now = System.nanoTime()
            val dt = ((now - lastTime) / 1_000_000_000f).coerceIn(0.001f, 0.05f)
            lastTime = now

            val localPlayer = combatants.find { it.isLocal }

            // 1. Move Local Player
            if (localPlayer != null && !localPlayer.isDead) {
                localPlayer.vx = moveVector.x * localPlayer.speed
                localPlayer.vy = moveVector.y * localPlayer.speed
                localPlayer.angle = aimAngle

                // Auto shoot if holding aim stick
                val currentTimeMs = System.currentTimeMillis()
                if (isShooting && currentTimeMs - lastShotTime >= localPlayer.weapon.fireRateMs) {
                    lastShotTime = currentTimeMs
                    val muzzleDist = localPlayer.radius + 16f
                    val mx = localPlayer.x + cos(localPlayer.angle) * muzzleDist
                    val my = localPlayer.y + sin(localPlayer.angle) * muzzleDist

                    for (p in 0 until localPlayer.weapon.pellets) {
                        val spreadAngle = (Math.random().toFloat() - 0.5f) * localPlayer.weapon.spread
                        val finalAngle = localPlayer.angle + spreadAngle
                        bullets.add(
                            BulletState(
                                x = mx,
                                y = my,
                                vx = cos(finalAngle) * localPlayer.weapon.speed,
                                vy = sin(finalAngle) * localPlayer.weapon.speed,
                                damage = localPlayer.weapon.damage,
                                maxRange = 900f,
                                color = localPlayer.weapon.color,
                                shooterId = localPlayer.id
                            )
                        )
                    }
                }
            }

            // 2. Update Combatants
            for (c in combatants) {
                if (c.isDead) {
                    c.respawnTimer -= dt
                    if (c.respawnTimer <= 0f) {
                        c.isDead = false
                        c.hp = c.maxHp
                        c.invulnTimer = 2.5f
                        val sp = selectedArena.spawns.random()
                        c.x = sp.x
                        c.y = sp.y
                    }
                    continue
                }

                if (c.invulnTimer > 0f) {
                    c.invulnTimer = max(0f, c.invulnTimer - dt)
                }

                // Bot AI
                if (c.isBot) {
                    c.botDecisionTimer -= dt
                    if (c.botDecisionTimer <= 0f || c.botTarget == null || c.botTarget?.isDead == true) {
                        c.botDecisionTimer = 0.5f + (Math.random().toFloat() * 0.5f)
                        c.botTarget = combatants.filter { it != c && !it.isDead }.randomOrNull()
                    }

                    c.botTarget?.let { target ->
                        val dx = target.x - c.x
                        val dy = target.y - c.y
                        val dist = hypot(dx, dy)
                        val tAngle = atan2(dy, dx)
                        c.angle = tAngle

                        if (dist > 220f) {
                            c.vx = cos(tAngle) * (c.speed * 0.85f)
                            c.vy = sin(tAngle) * (c.speed * 0.85f)
                        } else {
                            c.vx = 0f
                            c.vy = 0f
                        }

                        // Bot shooting
                        if (dist < 600f && Math.random() < 0.05) {
                            val mx = c.x + cos(c.angle) * (c.radius + 15f)
                            val my = c.y + sin(c.angle) * (c.radius + 15f)
                            bullets.add(
                                BulletState(
                                    x = mx,
                                    y = my,
                                    vx = cos(c.angle) * c.weapon.speed,
                                    vy = sin(c.angle) * c.weapon.speed,
                                    damage = c.weapon.damage,
                                    maxRange = 800f,
                                    color = c.weapon.color,
                                    shooterId = c.id
                                )
                            )
                        }
                    }
                }

                // Move with wall collision
                val nextX = c.x + c.vx * dt * 60f
                val nextY = c.y + c.vy * dt * 60f

                var colX = false
                for (w in selectedArena.walls) {
                    if (checkCircleRect(nextX, c.y, c.radius, w.x, w.y, w.w, w.h)) {
                        colX = true
                        break
                    }
                }
                if (!colX) c.x = nextX

                var colY = false
                for (w in selectedArena.walls) {
                    if (checkCircleRect(c.x, nextY, c.radius, w.x, w.y, w.w, w.h)) {
                        colY = true
                        break
                    }
                }
                if (!colY) c.y = nextY
            }

            // 3. Update Bullets
            val bulletIterator = bullets.iterator()
            while (bulletIterator.hasNext()) {
                val b = bulletIterator.next()
                val stepX = b.vx * dt * 60f
                val stepY = b.vy * dt * 60f
                b.x += stepX
                b.y += stepY
                b.traveled += hypot(stepX, stepY)

                if (b.traveled >= b.maxRange) {
                    bulletIterator.remove()
                    continue
                }

                // Check wall collision
                var hitWall = false
                for (w in selectedArena.walls) {
                    if (checkCircleRect(b.x, b.y, b.radius, w.x, w.y, w.w, w.h)) {
                        hitWall = true
                        break
                    }
                }
                if (hitWall) {
                    bulletIterator.remove()
                    continue
                }

                // Check player collision
                var hitPlayer = false
                for (target in combatants) {
                    if (target.id == b.shooterId || target.isDead || target.invulnTimer > 0f) continue
                    if (hypot(target.x - b.x, target.y - b.y) < target.radius + b.radius) {
                        target.hp -= b.damage
                        hitPlayer = true

                        // Check kill
                        if (target.hp <= 0f) {
                            target.isDead = true
                            target.deaths++
                            target.respawnTimer = 3f

                            val shooter = combatants.find { it.id == b.shooterId }
                            shooter?.let {
                                it.kills++
                                killFeed.add(0, KillFeedItem(System.currentTimeMillis(), it.name, target.name, it.weapon.name))
                                if (killFeed.size > 4) killFeed.removeLast()

                                if (it.kills >= targetKills) {
                                    recordMatchOutcome(it)
                                    screen = ScreenState.SUMMARY
                                }
                            }
                        }
                        break
                    }
                }
                if (hitPlayer) {
                    bulletIterator.remove()
                }
            }

            delay(16)
        }
    }

    when (screen) {
        ScreenState.MENU -> MenuScreen(
            currentTab = currentTab,
            onTabSelect = { currentTab = it },
            playerName = playerName,
            onNameChange = { playerName = it },
            selectedWeapon = selectedWeapon,
            onSelectWeapon = { selectedWeapon = it },
            selectedArena = selectedArena,
            onSelectArena = { selectedArena = it },
            botCount = botCount,
            onBotCountChange = { botCount = it },
            botDiff = botDiff,
            onBotDiffChange = { botDiff = it },
            suitColor = suitColor,
            onSuitColorChange = { suitColor = it },
            careerStats = careerStats,
            onResetCareerStats = { resetCareerStats() },
            onDeploy = { startGame() }
        )

        ScreenState.GAME -> CombatScreen(
            arena = selectedArena,
            combatants = combatants,
            bullets = bullets,
            killFeed = killFeed,
            targetKills = targetKills,
            isPaused = isPaused,
            onResume = { isPaused = false },
            onQuit = { screen = ScreenState.MENU },
            onMove = { moveVector = it },
            onAim = { angle, shooting ->
                aimAngle = angle
                isShooting = shooting
            }
        )

        ScreenState.SUMMARY -> MatchSummaryScreen(
            combatants = combatants,
            onRematch = { startGame() },
            onMenu = { screen = ScreenState.MENU }
        )
    }
}

fun checkCircleRect(cx: Float, cy: Float, cr: Float, rx: Float, ry: Float, rw: Float, rh: Float): Boolean {
    val closestX = cx.coerceIn(rx, rx + rw)
    val closestY = cy.coerceIn(ry, ry + rh)
    val dx = cx - closestX
    val dy = cy - closestY
    return (dx * dx + dy * dy) < (cr * cr)
}

// ==========================================
// MENU SCREEN
// ==========================================
@Composable
fun MenuScreen(
    currentTab: MenuTab,
    onTabSelect: (MenuTab) -> Unit,
    playerName: String,
    onNameChange: (String) -> Unit,
    selectedWeapon: Weapon,
    onSelectWeapon: (Weapon) -> Unit,
    selectedArena: Arena,
    onSelectArena: (Arena) -> Unit,
    botCount: Int,
    onBotCountChange: (Int) -> Unit,
    botDiff: String,
    onBotDiffChange: (String) -> Unit,
    suitColor: Color,
    onSuitColorChange: (Color) -> Unit,
    careerStats: CareerStats,
    onResetCareerStats: () -> Unit,
    onDeploy: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B12))
            .padding(12.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = Color(0x3300E5FF),
                    shape = RoundedCornerShape(4.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E5FF))
                ) {
                    Text(
                        "2D TACTICAL",
                        color = Color(0xFF00E5FF),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Spacer(Modifier.width(8.dp))
                Text(
                    "APEX ",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
                Text(
                    "STRIKE",
                    color = Color(0xFF00E5FF),
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "PWA & GITHUB PAGES READY",
                    color = Color.Gray,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        // Center Character Preview Stage
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = (-10).dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Canvas(modifier = Modifier.size(160.dp)) {
                    val cx = size.width / 2
                    val cy = size.height / 2

                    // Aim Laser
                    drawLine(
                        color = Color(0x6600E5FF),
                        start = Offset(cx + 25f, cy),
                        end = Offset(cx + 95f, cy),
                        strokeWidth = 2f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f))
                    )

                    // Weapon barrel
                    drawRect(
                        color = Color(0xFF2A364F),
                        topLeft = Offset(cx + 12f, cy - 4f),
                        size = Size(28f, 8f)
                    )

                    // Soldier Body
                    drawCircle(
                        color = Color(0xFF141C2B),
                        radius = 26f,
                        center = Offset(cx, cy)
                    )
                    drawCircle(
                        color = suitColor,
                        radius = 26f,
                        center = Offset(cx, cy),
                        style = Stroke(width = 3.5f)
                    )

                    // Visor
                    drawCircle(
                        color = Color(0xFF212C40),
                        radius = 12f,
                        center = Offset(cx - 2f, cy)
                    )
                    drawArc(
                        color = suitColor,
                        startAngle = -50f,
                        sweepAngle = 100f,
                        useCenter = false,
                        topLeft = Offset(cx + 2f, cy - 7f),
                        size = Size(14f, 14f),
                        style = Stroke(width = 3.5f)
                    )
                }

                // Callsign Editor
                Surface(
                    color = Color(0x990A101C),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x5500E5FF))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            playerName,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(Modifier.width(6.dp))
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Randomize",
                            tint = Color(0xFF00E5FF),
                            modifier = Modifier
                                .size(16.dp)
                                .clickable {
                                    val prefixes = listOf("VIPER", "TITAN", "GHOST", "SHADOW", "BLITZ")
                                    onNameChange("${prefixes.random()}-${(10..99).random()}")
                                }
                        )
                    }
                }
            }
        }

        // Left/Right Content Panels based on Tab
        when (currentTab) {
            MenuTab.PLAY -> {
                // Solo Mode Config Card (Left)
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .width(260.dp)
                        .padding(start = 12.dp)
                ) {
                    Surface(
                        color = Color(0xCC0E1624),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "SOLO VS BOTS",
                                color = Color(0xFF00FF66),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Spacer(Modifier.height(8.dp))
                            Text("BOT COUNT: $botCount", color = Color.LightGray, fontSize = 11.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                listOf(1, 2, 4).forEach { count ->
                                    Button(
                                        onClick = { onBotCountChange(count) },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (botCount == count) Color(0xFF00E5FF) else Color(0x22FFFFFF)
                                        ),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Text("$count", fontSize = 11.sp, color = if (botCount == count) Color.Black else Color.White)
                                    }
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text("DIFFICULTY: $botDiff", color = Color.LightGray, fontSize = 11.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                listOf("ROOKIE", "VETERAN", "APEX").forEach { diff ->
                                    Button(
                                        onClick = { onBotDiffChange(diff) },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (botDiff == diff) Color(0xFF00E5FF) else Color(0x22FFFFFF)
                                        ),
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Text(diff, fontSize = 9.sp, color = if (botDiff == diff) Color.Black else Color.White)
                                    }
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = onDeploy,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8)),
                                modifier = Modifier.fillMaxWidth().height(36.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("DEPLOY SOLO ▶", fontWeight = FontWeight.Black, fontSize = 12.sp)
                            }
                        }
                    }
                }

                // Multiplayer Info (Right)
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .width(260.dp)
                        .padding(end = 12.dp)
                ) {
                    Surface(
                        color = Color(0xCC0E1624),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x3300E5FF))
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "MULTIPLAYER (PEERJS)",
                                color = Color(0xFF00E5FF),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "P2P WebRTC room sync enabled. Host or join matches with code from the root PWA directly on desktop or mobile!",
                                color = Color.LightGray,
                                fontSize = 10.sp,
                                lineHeight = 14.sp
                            )
                            Spacer(Modifier.height(8.dp))
                            Surface(
                                color = Color(0x3300E5FF),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    "ROOM: APEX-${(1000..9999).random()}",
                                    color = Color(0xFF00E5FF),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Button(
                                onClick = onDeploy,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0077B6)),
                                modifier = Modifier.fillMaxWidth().height(36.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("LAUNCH ARENA ▶", fontWeight = FontWeight.Black, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            MenuTab.WEAPONS -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(top = 180.dp)
                ) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(ALL_WEAPONS) { w ->
                            Surface(
                                color = if (w == selectedWeapon) Color(0x44FFB700) else Color(0xCC0E1624),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (w == selectedWeapon) Color(0xFFFFB700) else Color(0x33FFFFFF)
                                ),
                                modifier = Modifier.clickable { onSelectWeapon(w) }
                            ) {
                                Column(modifier = Modifier.padding(8.dp).width(120.dp)) {
                                    Text("${w.icon} ${w.name}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    Text(w.category, color = Color.Gray, fontSize = 9.sp)
                                    Spacer(Modifier.height(4.dp))
                                    Text("DMG: ${w.damage.toInt()} | SPD: ${w.speed.toInt()}", color = Color(0xFF00E5FF), fontSize = 9.sp)
                                }
                            }
                        }
                    }
                }
            }

            MenuTab.ARENAS -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(top = 180.dp)
                ) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(ALL_ARENAS) { a ->
                            Surface(
                                color = if (a == selectedArena) Color(0x4400E5FF) else Color(0xCC0E1624),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (a == selectedArena) Color(0xFF00E5FF) else Color(0x33FFFFFF)
                                ),
                                modifier = Modifier.clickable { onSelectArena(a) }
                            ) {
                                Column(modifier = Modifier.padding(8.dp).width(150.dp)) {
                                    Text(a.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    Text(a.desc, color = Color.Gray, fontSize = 8.sp, maxLines = 2)
                                }
                            }
                        }
                    }
                }
            }

            MenuTab.SETTINGS -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(top = 115.dp)
                        .widthIn(max = 520.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Career Stats Section
                        Surface(
                            color = Color(0xEE0E1624),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x4400E5FF)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Surface(
                                            color = Color(0x3300E5FF),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                "DOSSIER",
                                                color = Color(0xFF00E5FF),
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                        Spacer(Modifier.width(6.dp))
                                        Text(
                                            "CAREER STATS",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 12.sp,
                                            letterSpacing = 1.sp
                                        )
                                    }

                                    Button(
                                        onClick = onResetCareerStats,
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x22FF0055)),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        modifier = Modifier.height(24.dp),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            "RESET STATS",
                                            color = Color(0xFFFF4D79),
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Spacer(Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    StatBox("KILLS", "${careerStats.kills}", Color.White, Modifier.weight(1f))
                                    StatBox("DEATHS", "${careerStats.deaths}", Color.White, Modifier.weight(1f))
                                    StatBox("K/D", careerStats.kdRatio, Color(0xFF00E5FF), Modifier.weight(1f))
                                    StatBox("WINS", "${careerStats.wins}", Color.White, Modifier.weight(1f))
                                    StatBox("DEFEATS", "${careerStats.losses}", Color.White, Modifier.weight(1f))
                                    StatBox("W/L", careerStats.wlRatio, Color(0xFFFFB700), Modifier.weight(1f))
                                }
                            }
                        }

                        // Suit Color
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("SUIT COLOR:", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            listOf(Color(0xFF00E5FF), Color(0xFFFF0055), Color(0xFF00FF66), Color(0xFFFFB700), Color(0xFFB026FF)).forEach { c ->
                                Box(
                                    modifier = Modifier
                                        .size(22.dp)
                                        .clip(CircleShape)
                                        .background(c)
                                        .border(
                                            width = if (suitColor == c) 2.dp else 0.dp,
                                            color = Color.White,
                                            shape = CircleShape
                                        )
                                        .clickable { onSuitColorChange(c) }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Bottom Navigation Tabs
        Surface(
            color = Color(0xEE090E18),
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF)),
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 6.dp)
        ) {
            Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)) {
                MenuTab.values().forEach { tab ->
                    val isSelected = currentTab == tab
                    Surface(
                        color = if (isSelected) Color(0x3300E5FF) else Color.Transparent,
                        shape = RoundedCornerShape(16.dp),
                        border = if (isSelected) androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E5FF)) else null,
                        modifier = Modifier.clickable { onTabSelect(tab) }
                    ) {
                        Text(
                            tab.name,
                            color = if (isSelected) Color.White else Color.Gray,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// COMBAT SCREEN
// ==========================================
@Composable
fun CombatScreen(
    arena: Arena,
    combatants: List<CombatantState>,
    bullets: List<BulletState>,
    killFeed: List<KillFeedItem>,
    targetKills: Int,
    isPaused: Boolean,
    onResume: () -> Unit,
    onQuit: () -> Unit,
    onMove: (Offset) -> Unit,
    onAim: (Float, Boolean) -> Unit,
) {
    val localPlayer = combatants.find { it.isLocal }
    val cameraOffsetX = remember { mutableFloatStateOf(0f) }
    val cameraOffsetY = remember { mutableFloatStateOf(0f) }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // Main World Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            localPlayer?.let { p ->
                val targetCamX = p.x - size.width / 2
                val targetCamY = p.y - size.height / 2
                cameraOffsetX.floatValue += (targetCamX - cameraOffsetX.floatValue) * 0.15f
                cameraOffsetY.floatValue += (targetCamY - cameraOffsetY.floatValue) * 0.15f
            }

            val camX = cameraOffsetX.floatValue
            val camY = cameraOffsetY.floatValue

            // Draw Arena Floor
            drawRect(
                color = arena.floorColor,
                topLeft = Offset(-camX, -camY),
                size = Size(arena.width, arena.height)
            )

            // Draw Walls
            for (w in arena.walls) {
                drawRect(
                    color = arena.wallColor,
                    topLeft = Offset(w.x - camX, w.y - camY),
                    size = Size(w.w, w.h)
                )
                drawRect(
                    color = arena.wallGlow,
                    topLeft = Offset(w.x - camX, w.y - camY),
                    size = Size(w.w, w.h),
                    style = Stroke(width = 2f)
                )
            }

            // Draw Bullets
            for (b in bullets) {
                drawCircle(
                    color = b.color,
                    radius = b.radius,
                    center = Offset(b.x - camX, b.y - camY)
                )
            }

            // Draw Combatants
            for (c in combatants) {
                if (c.isDead) continue

                val cx = c.x - camX
                val cy = c.y - camY

                // Invulnerability shield
                if (c.invulnTimer > 0f) {
                    drawCircle(
                        color = Color(0x3300E5FF),
                        radius = c.radius + 10f,
                        center = Offset(cx, cy)
                    )
                    drawCircle(
                        color = Color(0xFF00E5FF),
                        radius = c.radius + 10f,
                        center = Offset(cx, cy),
                        style = Stroke(width = 2f)
                    )
                }

                // Rotate body
                rotate(degrees = c.angle * (180f / Math.PI.toFloat()), pivot = Offset(cx, cy)) {
                    // Gun
                    drawRect(
                        color = Color(0xFF2B3648),
                        topLeft = Offset(cx + 8f, cy - 3f),
                        size = Size(18f, 6f)
                    )

                    // Hands
                    drawCircle(
                        color = Color(0xFF37445A),
                        radius = 4.5f,
                        center = Offset(cx + 12f, cy - 7f)
                    )
                    drawCircle(
                        color = Color(0xFF37445A),
                        radius = 4.5f,
                        center = Offset(cx + 12f, cy + 7f)
                    )

                    // Body
                    drawCircle(
                        color = Color(0xFF161C28),
                        radius = c.radius,
                        center = Offset(cx, cy)
                    )
                    drawCircle(
                        color = c.color,
                        radius = c.radius,
                        center = Offset(cx, cy),
                        style = Stroke(width = 2.5f)
                    )

                    // Helmet
                    drawCircle(
                        color = Color(0xFF222B3D),
                        radius = 9f,
                        center = Offset(cx - 2f, cy)
                    )

                    // Visor
                    drawArc(
                        color = c.color,
                        startAngle = -60f,
                        sweepAngle = 120f,
                        useCenter = false,
                        topLeft = Offset(cx + 2f, cy - 5f),
                        size = Size(10f, 10f),
                        style = Stroke(width = 2.5f)
                    )
                }

                // Overhead HP bar for non-local
                if (!c.isLocal) {
                    val hpPct = (c.hp / c.maxHp).coerceIn(0f, 1f)
                    drawRect(
                        color = Color.Black,
                        topLeft = Offset(cx - 18f, cy - c.radius - 12f),
                        size = Size(36f, 4f)
                    )
                    drawRect(
                        color = if (hpPct > 0.3f) Color(0xFF00E5FF) else Color(0xFFFF0055),
                        topLeft = Offset(cx - 18f, cy - c.radius - 12f),
                        size = Size(36f * hpPct, 4f)
                    )
                }
            }
        }

        // MINIMAL IN-GAME HUD OVERLAY
        Box(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            // Top Center: HP Bar
            localPlayer?.let { p ->
                val hpPct = (p.hp / p.maxHp).coerceIn(0f, 1f)
                Surface(
                    color = Color(0xCC0A101C),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x4400E5FF)),
                    modifier = Modifier.align(Alignment.TopCenter)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.width(180.dp)
                        ) {
                            Text("INTEGRITY", color = Color.Gray, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            Text("${p.hp.toInt()} HP", color = Color(0xFF00E5FF), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .width(180.dp)
                                .height(6.dp)
                                .background(Color(0x33FFFFFF), RoundedCornerShape(3.dp))
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(hpPct)
                                    .background(
                                        if (hpPct > 0.3f) Color(0xFF00E5FF) else Color(0xFFFF0055),
                                        RoundedCornerShape(3.dp)
                                    )
                            )
                        }
                    }
                }
            }

            // Top Right: Scoreboard
            localPlayer?.let { p ->
                val topOpponent = combatants.filter { !it.isLocal }.maxByOrNull { it.kills }
                Surface(
                    color = Color(0xCC0A101C),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF)),
                    modifier = Modifier.align(Alignment.TopEnd)
                ) {
                    Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.width(100.dp)) {
                            Text("YOU", color = Color(0xFF00E5FF), fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            Text("${p.kills}K / ${p.deaths}D", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                        topOpponent?.let { top ->
                            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.width(100.dp)) {
                                Text("RIVAL", color = Color(0xFFFF0055), fontWeight = FontWeight.Bold, fontSize = 9.sp)
                                Text("${top.kills}K / ${top.deaths}D", color = Color.Gray, fontSize = 9.sp)
                            }
                        }
                    }
                }
            }

            // Top Left: Target & Circular Minimap
            Column(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 2.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    color = Color(0xCC0A101C),
                    shape = RoundedCornerShape(6.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                ) {
                    Text(
                        "TARGET: $targetKills KILLS",
                        color = Color(0xFFFFB700),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                // Small Circular Minimap for tactical situational awareness
                CircularMinimap(
                    arena = arena,
                    localPlayer = localPlayer,
                    combatants = combatants,
                    modifier = Modifier.size(86.dp)
                )
            }

            // Kill Feed
            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 50.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                for (item in killFeed) {
                    Surface(
                        color = Color(0xDD0A101C),
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x22FFFFFF))
                    ) {
                        Text(
                            "${item.killer} ➔ ${item.victim}",
                            color = Color.White,
                            fontSize = 9.sp,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // DUAL VIRTUAL JOYSTICKS
            // Left Joystick: Movement
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(bottom = 12.dp, start = 12.dp)
                    .size(130.dp)
            ) {
                VirtualJoystick(
                    label = "MOVE",
                    baseColor = Color(0x3300E5FF),
                    stickColor = Color(0xFF00E5FF),
                    onDrag = { dx, dy ->
                        onMove(Offset(dx, dy))
                    },
                    onRelease = {
                        onMove(Offset.Zero)
                    }
                )
            }

            // Right Joystick: Aim & Auto-Shoot
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 12.dp, end = 12.dp)
                    .size(130.dp)
            ) {
                VirtualJoystick(
                    label = "AIM & FIRE",
                    baseColor = Color(0x33FF0055),
                    stickColor = Color(0xFFFF0055),
                    onDrag = { dx, dy ->
                        val angle = atan2(dy, dx)
                        onAim(angle, true)
                    },
                    onRelease = {
                        onAim(0f, false)
                    }
                )
            }
        }
    }
}

// ==========================================
// VIRTUAL JOYSTICK COMPONENT
// ==========================================
@Composable
fun VirtualJoystick(
    label: String,
    baseColor: Color,
    stickColor: Color,
    onDrag: (Float, Float) -> Unit,
    onRelease: () -> Unit,
) {
    var stickOffset by remember { mutableStateOf(Offset.Zero) }
    val maxRadius = 45f

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragEnd = {
                        stickOffset = Offset.Zero
                        onRelease()
                    },
                    onDragCancel = {
                        stickOffset = Offset.Zero
                        onRelease()
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        val newOffset = stickOffset + dragAmount
                        val dist = hypot(newOffset.x, newOffset.y)
                        stickOffset = if (dist > maxRadius) {
                            val angle = atan2(newOffset.y, newOffset.x)
                            Offset(cos(angle) * maxRadius, sin(angle) * maxRadius)
                        } else {
                            newOffset
                        }
                        val normalizedX = stickOffset.x / maxRadius
                        val normalizedY = stickOffset.y / maxRadius
                        onDrag(normalizedX, normalizedY)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        // Base ring
        Box(
            modifier = Modifier
                .size(110.dp)
                .clip(CircleShape)
                .background(baseColor)
                .border(2.dp, stickColor.copy(alpha = 0.4f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(label, color = Color.White.copy(alpha = 0.4f), fontSize = 9.sp, fontWeight = FontWeight.Bold)
        }

        // Floating stick knob
        Box(
            modifier = Modifier
                .offset { IntOffset(stickOffset.x.roundToInt(), stickOffset.y.roundToInt()) }
                .size(46.dp)
                .clip(CircleShape)
                .background(stickColor)
                .border(2.dp, Color.White, CircleShape)
        )
    }
}

// ==========================================
// CIRCULAR MINIMAP COMPONENT
// ==========================================
@Composable
fun CircularMinimap(
    arena: Arena,
    localPlayer: CombatantState?,
    combatants: List<CombatantState>,
    modifier: Modifier = Modifier
) {
    // Pulse/sweep radar animation
    val infiniteTransition = rememberInfiniteTransition(label = "radar")
    val sweepAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(2800, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "sweep"
    )

    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(Color(0xDD0A101C))
            .border(1.5.dp, Color(0xFF00E5FF).copy(alpha = 0.65f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val r = size.minDimension / 2f

            // Radar concentric rings
            drawCircle(Color(0x1F00E5FF), radius = r * 0.35f, center = Offset(cx, cy), style = Stroke(0.8f))
            drawCircle(Color(0x1F00E5FF), radius = r * 0.70f, center = Offset(cx, cy), style = Stroke(0.8f))

            // Crosshair lines
            drawLine(Color(0x1F00E5FF), start = Offset(cx, 0f), end = Offset(cx, size.height), strokeWidth = 0.8f)
            drawLine(Color(0x1F00E5FF), start = Offset(0f, cy), end = Offset(size.width, cy), strokeWidth = 0.8f)

            // Radar sweep line
            val radSweep = (sweepAngle * (Math.PI / 180f)).toFloat()
            val sweepX = cx + cos(radSweep) * r
            val sweepY = cy + sin(radSweep) * r
            drawLine(Color(0x3300E5FF), start = Offset(cx, cy), end = Offset(sweepX, sweepY), strokeWidth = 1.2f)

            // Scaled Arena Coordinate transformation
            val scale = (size.minDimension * 0.82f) / max(arena.width, arena.height)
            val offX = (size.width - arena.width * scale) / 2f
            val offY = (size.height - arena.height * scale) / 2f

            // Draw Walls / Obstacles
            for (w in arena.walls) {
                val wx = offX + w.x * scale
                val wy = offY + w.y * scale
                val ww = w.w * scale
                val wh = w.h * scale
                drawRect(
                    color = Color(0xFF1E2D44),
                    topLeft = Offset(wx, wy),
                    size = Size(ww, wh)
                )
                drawRect(
                    color = Color(0x6600E5FF),
                    topLeft = Offset(wx, wy),
                    size = Size(ww, wh),
                    style = Stroke(0.8f)
                )
            }

            // Draw other combatants (Enemies/Bots/Teammates)
            for (c in combatants) {
                if (c.isDead || c.isLocal) continue
                val px = offX + c.x * scale
                val py = offY + c.y * scale
                drawCircle(
                    color = c.color,
                    radius = 2.5f,
                    center = Offset(px, py)
                )
            }

            // Draw Local Player
            localPlayer?.let { p ->
                if (!p.isDead) {
                    val px = offX + p.x * scale
                    val py = offY + p.y * scale

                    // Direction heading vector
                    val dirLen = 7f
                    drawLine(
                        color = Color(0xFF00E5FF),
                        start = Offset(px, py),
                        end = Offset(px + cos(p.angle) * dirLen, py + sin(p.angle) * dirLen),
                        strokeWidth = 2f
                    )

                    // Player blip
                    drawCircle(
                        color = Color(0xFF00E5FF),
                        radius = 3.5f,
                        center = Offset(px, py)
                    )
                    drawCircle(
                        color = Color.White,
                        radius = 1.5f,
                        center = Offset(px, py)
                    )
                }
            }
        }
    }
}

// ==========================================
// MATCH SUMMARY SCREEN
// ==========================================
@Composable
fun MatchSummaryScreen(
    combatants: List<CombatantState>,
    onRematch: () -> Unit,
    onMenu: () -> Unit,
) {
    val winner = combatants.maxByOrNull { it.kills }
    val isLocalWinner = winner?.isLocal == true

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xEE070B12))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = Color(0xFF0E1624),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E5FF)),
            modifier = Modifier.widthIn(max = 420.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    if (isLocalWinner) "VICTORY" else "DEFEAT",
                    color = if (isLocalWinner) Color(0xFFFFB700) else Color(0xFFFF0055),
                    fontWeight = FontWeight.Black,
                    fontSize = 24.sp
                )
                Text(
                    "Combat Target Reached by ${winner?.name}",
                    color = Color.LightGray,
                    fontSize = 12.sp
                )
                Spacer(Modifier.height(14.dp))

                // Scoreboard Table
                Column(modifier = Modifier.fillMaxWidth()) {
                    val sorted = combatants.sortedByDescending { it.kills }
                    sorted.forEachIndexed { i, c ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (c.isLocal) Color(0x3300E5FF) else Color.Transparent)
                                .padding(vertical = 4.dp, horizontal = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("#${i + 1} ${c.name}", color = if (c.isLocal) Color(0xFF00E5FF) else Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("${c.kills} KILLS / ${c.deaths} DEATHS", color = Color.LightGray, fontSize = 11.sp)
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onRematch,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00B4D8)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("PLAY AGAIN", fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = onMenu,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x33FFFFFF)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("MAIN MENU", color = Color.White)
                    }
                }
            }
        }
    }
}

// ==========================================
// CAREER STAT BOX COMPONENT
// ==========================================
@Composable
fun StatBox(
    label: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = Color(0x6605080F),
        shape = RoundedCornerShape(6.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x22FFFFFF)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                value,
                color = valueColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace,
                maxLines = 1
            )
            Text(
                label,
                color = Color.Gray,
                fontSize = 7.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
        }
    }
}

