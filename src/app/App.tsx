import { useEffect, useState, type CSSProperties } from 'react'
import { Board } from '../features/battle/components/Board'
import { FolderScene } from '../features/chips/components/FolderScene'
import { loadChipCatalog } from '../features/chips/chipCatalog'
import { useGameStore } from '../features/simulation/store/gameStore'
import { AreaMapScene } from '../features/world/components/AreaMapScene'
import { ChipTraderScene } from '../features/world/components/ChipTraderScene'
import { HigsbyShopScene } from '../features/world/components/HigsbyShopScene'

const SPEEDS = [1, 2, 4] as const
const battleChipCatalog = loadChipCatalog(100)

export function App() {
  const [scene, setScene] = useState<'battle' | 'folder' | 'areaMap' | 'chipTrader' | 'higsbyShop'>('battle')
  const [showBattleFolderPanel, setShowBattleFolderPanel] = useState(false)
  const [showDebugMenu, setShowDebugMenu] = useState(false)
  const [debugVirusActor, setDebugVirusActor] = useState('mettaur')
  const ticks = useGameStore((state) => state.ticks)
  const speed = useGameStore((state) => state.speed)
  const combat = useGameStore((state) => state.combat)
  const entities = useGameStore((state) => state.entities)
  const chipFolder = useGameStore((state) => state.chipFolder)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const debugPaused = useGameStore((state) => state.debugPaused)
  const setDebugPaused = useGameStore((state) => state.setDebugPaused)
  const stepFrame = useGameStore((state) => state.stepFrame)
  const debugSpriteScalePercent = useGameStore((state) => state.debugSpriteScalePercent)
  const setDebugSpriteScalePercent = useGameStore((state) => state.setDebugSpriteScalePercent)
  const debugForceNextCustomDrawProgramAdvance = useGameStore((state) => state.debugForceNextCustomDrawProgramAdvance)
  const debugCompleteCurrentWave = useGameStore((state) => state.debugCompleteCurrentWave)
  const debugJumpToBossWave = useGameStore((state) => state.debugJumpToBossWave)
  const debugSetZenny99999 = useGameStore((state) => state.debugSetZenny99999)
  const debugStartWaveWithVirus = useGameStore((state) => state.debugStartWaveWithVirus)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const cycleMegamanControlMode = useGameStore((state) => state.cycleMegamanControlMode)
  const useChipSlot = useGameStore((state) => state.useChipSlot)
  const useLeftmostChip = useGameStore((state) => state.useLeftmostChip)
  const manualFireBuster = useGameStore((state) => state.manualFireBuster)
  const retryBossWave = useGameStore((state) => state.retryBossWave)
  const closeWaveResult = useGameStore((state) => state.closeWaveResult)
  const resetBattle = useGameStore((state) => state.resetBattle)
  const challengeBossFromInfinite = useGameStore((state) => state.challengeBossFromInfinite)
  const clearHighlightedAreaLevel = useGameStore((state) => state.clearHighlightedAreaLevel)
  const megamanRecoveryTicks = useGameStore((state) => state.megamanRecoveryTicks)
  const mettaurRecoveryTicks = useGameStore((state) => state.mettaurRecoveryTicks)
  const start = useGameStore((state) => state.start)

  useEffect(() => {
    const stop = start()
    return () => stop()
  }, [start])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (scene !== 'battle') {
        return
      }

      const key = event.key
      const upperKey = key.toUpperCase()

      if (key >= '1' && key <= '5') {
        event.preventDefault()
        useChipSlot(Number.parseInt(key, 10) - 1)
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (combat.megamanControlMode === 'manual') {
          manualFireBuster()
        } else {
          useLeftmostChip()
        }
        return
      }

      if (upperKey === 'F') {
        event.preventDefault()
        manualFireBuster()
        return
      }

      switch (upperKey) {
        case 'ARROWUP':
        case 'W':
          event.preventDefault()
          movePlayer(-1, 0)
          break
        case 'ARROWDOWN':
        case 'S':
          event.preventDefault()
          movePlayer(1, 0)
          break
        case 'ARROWLEFT':
        case 'A':
          event.preventDefault()
          movePlayer(0, -1)
          break
        case 'ARROWRIGHT':
        case 'D':
          event.preventDefault()
          movePlayer(0, 1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [combat.megamanControlMode, manualFireBuster, movePlayer, scene, useChipSlot, useLeftmostChip])


  useEffect(() => {
    if (!combat.waveResult) {
      return
    }

    const autoCloseWaveResultTimeout = window.setTimeout(() => {
      closeWaveResult()
    }, 3000)

    return () => window.clearTimeout(autoCloseWaveResultTimeout)
  }, [closeWaveResult, combat.waveResult])

  useEffect(() => {
    if (combat.waveStatus === 'levelCleared' && combat.highlightedAreaLevel) {
      setScene('areaMap')
      return
    }

    if (scene === 'areaMap' && combat.highlightedAreaLevel === null) {
      clearHighlightedAreaLevel()
    }
  }, [clearHighlightedAreaLevel, combat.highlightedAreaLevel, combat.waveStatus, scene])

  const target = entities[combat.targetId]
  const canRetryBossWave = combat.currentWave === 9 && combat.waveStatus !== 'levelCleared' && combat.waveResult === null

  return (
    <main className="app-shell" style={{ '--sprite-scale': `${debugSpriteScalePercent / 100}` } as CSSProperties}>
      <header>
        <h1>Idle Network — M3 Wave FSM Vertical Slice</h1>
        <p>Wave-based progression baseline: 10-wave FSM with boss wave gate, while preserving M2 combat/chip systems.</p>
      </header>

      <section className="scene-taskbar top" aria-label="Scene navigation">
        <button type="button" className={scene === 'battle' ? 'active' : ''} onClick={() => setScene('battle')}>
          Battle
        </button>
        <button type="button" className={scene === 'folder' ? 'active' : ''} onClick={() => setScene('folder')}>
          Folder
        </button>
        <button type="button" className={scene === 'areaMap' ? 'active' : ''} onClick={() => setScene('areaMap')}>
          Area Map
        </button>
        <button type="button" className={scene === 'chipTrader' ? 'active' : ''} onClick={() => setScene('chipTrader')}>
          Chip Trader
        </button>
        <button type="button" className={scene === 'higsbyShop' ? 'active' : ''} onClick={() => setScene('higsbyShop')}>
          Higsby's Shop
        </button>
      </section>

      {scene === 'battle' ? (
        <>
          <section className="hud">
        <span>Ticks: {ticks}</span>
        <div className="speed-controls" role="group" aria-label="Simulation speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              className={value === speed ? 'active' : ''}
              onClick={() => setSpeed(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
        <button type="button" onClick={cycleMegamanControlMode}>
          Control: {combat.megamanControlMode}
        </button>
        <button type="button" onClick={() => setShowBattleFolderPanel((current) => !current)}>
          {showBattleFolderPanel ? 'Hide Folder' : 'Show Folder'}
        </button>
        <button type="button" onClick={() => setShowDebugMenu((current) => !current)}>
          {showDebugMenu ? 'Hide Debug' : 'Show Debug'}
        </button>
        <span>Level {combat.currentLevel} · Wave {combat.isInfiniteMode ? '∞' : `${combat.currentWave}/10`} {combat.isBossWave && !combat.isInfiniteMode ? '(Boss)' : ''}</span>
        <span>Wave state: {combat.waveStatus}</span>
        {canRetryBossWave ? (
          <button type="button" onClick={retryBossWave}>
            Retry Boss (Wave 10)
          </button>
        ) : null}
        <span>Zenny: {combat.totalZenny}</span>
        <span>Viruses: {combat.virusesRemaining}/{combat.virusesTotal}</span>
          </section>

          {showDebugMenu ? (
            <section className="debug-controls battle-debug-panel" aria-label="Debug simulation controls">
              <strong>Debug Controls</strong>
              <div className="debug-controls-row">
                <button type="button" onClick={() => setDebugPaused(!debugPaused)}>
                  {debugPaused ? 'Resume' : 'Pause'} Simulation
                </button>
                <button type="button" onClick={stepFrame} disabled={!debugPaused}>
                  Advance 1 Frame
                </button>
                <span>{debugPaused ? 'Paused' : 'Running'}</span>
                <span>Recovery: MegaMan {megamanRecoveryTicks}t / Mettaur {mettaurRecoveryTicks}t</span>
              </div>
              <div className="debug-controls-row">
                <button type="button" onClick={debugForceNextCustomDrawProgramAdvance}>
                  Force PA on Next Draw
                </button>
                <button type="button" onClick={debugCompleteCurrentWave}>
                  Complete Wave (Debug)
                </button>
                <button type="button" onClick={debugJumpToBossWave}>
                  Jump to Wave 10 (Debug)
                </button>
                <button type="button" onClick={debugSetZenny99999}>
                  Set Zenny 99999 (Debug)
                </button>
              </div>

              <div className="debug-controls-row">
                <label htmlFor="debug-virus-select">Spawn wave actor:</label>
                <select
                  id="debug-virus-select"
                  value={debugVirusActor}
                  onChange={(event) => setDebugVirusActor(event.currentTarget.value)}
                >
                  <option value="mettaur">Mettaur</option>
                  <option value="swordy">Swordy</option>
                  <option value="fishy">Fishy</option>
                  <option value="fireman">FireMan</option>
                </select>
                <button type="button" onClick={() => debugStartWaveWithVirus(debugVirusActor)}>
                  Start Wave with Selected Virus
                </button>
              </div>
              <label className="sprite-scale-control" htmlFor="sprite-scale-slider">
                Sprite scale: {debugSpriteScalePercent}%
              </label>
              <input
                id="sprite-scale-slider"
                type="range"
                min={100}
                max={400}
                step={10}
                value={debugSpriteScalePercent}
                onChange={(event) => setDebugSpriteScalePercent(Number(event.currentTarget.value))}
              />
            </section>
          ) : null}

          <section className="gauge-card" aria-label="Custom gauge">
        <strong>Custom Gauge</strong>
        <div className="gauge-track" role="progressbar" aria-valuemin={0} aria-valuemax={combat.customGaugeMaxTicks} aria-valuenow={combat.customGaugeTicks}>
          <div className="gauge-fill" style={{ width: `${(combat.customGaugeTicks / combat.customGaugeMaxTicks) * 100}%` }} />
        </div>
        <span>
          {combat.customGaugeTicks}/{combat.customGaugeMaxTicks}
        </span>
        <span>Barrier: {combat.barrierCharges > 0 ? 'Active' : 'None'}</span>
        <span>Hitstun: {combat.megamanHitstunTicks}t</span>
        <span>Buffered chip: {combat.queuedChipSlot !== null ? `Slot ${combat.queuedChipSlot + 1}` : 'None'}</span>
          </section>

          <section className="hp-hud" aria-label="HP tracker">
        <div className="hp-card">
          <strong>MegaMan.EXE</strong>
          <span>
            HP: {combat.playerHp}/{combat.playerMaxHp}
          </span>
          <span>Status: {entities.megaman.alive ? 'Alive' : 'KO'}</span>
          <span>
            Panel ({entities.megaman.position.row + 1},{entities.megaman.position.col + 1})
          </span>
          <button type="button" onClick={resetBattle} disabled={entities.megaman.alive}>
            Reset Battle State
          </button>
        </div>
        <div className="hp-card">
          <strong>{target.name}</strong>
          <span>
            HP: {combat.targetHp}/{combat.targetMaxHp}
          </span>
          <span>Status: {target.alive ? 'Alive' : 'KO'}</span>
          <span>
            Telegraph: {combat.mettaurTelegraphTicksRemaining > 0 ? `${combat.mettaurTelegraphTicksRemaining}t` : 'Idle'}
          </span>
        </div>
          </section>

          <section className="combat-log" aria-live="polite">
        Last event: {combat.lastEvent}
          </section>

          {combat.programAdvanceAnimation ? <section className="pa-banner">PROGRAM ADVANCE! {combat.programAdvanceAnimation.name}</section> : null}


          <p className="control-tip">Manual mode: Move (WASD/Arrows), Buster (Space or F), Chips (1-5). Buster/swing now need row alignment, so dodging telegraphs and re-lining shots matters. Yellow panels show active enemy hitboxes (e.g., Mettaur swing). Cyan panels are temporary placeholders for chip attack range/projectile zones (bomb/sword/hitscan). Semi-auto: auto move+buster, manual chips. Full-auto: auto move+buster+chips (manual chip override still works).</p>

          {combat.isInfiniteMode ? (
            <section className="infinite-controls">
              <button type="button" onClick={challengeBossFromInfinite}>CHALLENGE BOSS</button>
            </section>
          ) : null}

          <section className="battle-board-shell">
            <Board />

            {(combat.battleStartBannerTicks > 0 || combat.waveResult) ? (
              <div className="battle-grid-overlay">
                {combat.battleStartBannerTicks > 0 ? <section className="battle-start-banner">BATTLE START</section> : null}

                {combat.waveResult ? (
                  <section className="result-overlay" role="dialog" aria-modal="true" aria-label="Wave clear result">
                    <div className="result-modal">
                      <header className="result-modal-header">RESULT</header>
                      <div className="result-row">
                        <span>DeleteTime</span>
                        <strong>{combat.waveResult.deleteTimeLabel}</strong>
                      </div>
                      <div className="result-row">
                        <span>Busting LV.</span>
                        <strong>{combat.waveResult.bustingLv}</strong>
                      </div>
                      <div className="result-reward">
                        <div>GET DATA</div>
                        {combat.waveResult.reward.type === 'zenny' ? (
                          <strong>{combat.waveResult.reward.zenny} Z</strong>
                        ) : (
                          <strong>{combat.waveResult.reward.chips.map((chip) => `${chip.name} ${chip.code}`).join(', ')}</strong>
                        )}
                      </div>
                      <button type="button" onClick={closeWaveResult}>
                        Continue
                      </button>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
            {showBattleFolderPanel ? (
              <aside className="battle-folder-panel open" aria-label="Battle folder chip list">
                <header className="battle-folder-panel-header">
                  <strong>Battle Folder View</strong>
                  <span>{chipFolder.length}/30</span>
                </header>
                <div className="folder-chip-list" role="listbox" aria-label="Battle folder list">
                  {chipFolder.map((chip, index) => (
                    <div key={`battle-folder-chip-${index}-${chip.id}-${chip.code}`} className="folder-chip-row">
                      <span className="folder-chip-row-index">{index + 1}</span>
                      <span className="folder-chip-row-name">{chip.name}</span>
                      <span className="folder-chip-row-code">{chip.code}</span>
                      <span className="folder-chip-row-mb">{battleChipCatalog[chip.id].mb}MB</span>
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </section>

          <section className="chip-hand-bar" aria-label="Chip hand area">
        {combat.chipHand.map((chip, index) => (
          <button
            key={`chip-slot-${index}`}
            type="button"
            className={`chip-slot ${chip ? 'filled' : 'empty'} ${combat.queuedChipSlot === index ? 'queued' : ''} ${
              chip?.id === 'zcannon' ? 'pa-chip' : ''
            } ${combat.programAdvanceAnimation?.targetSlot === index ? 'pa-target' : ''} ${
              combat.programAdvanceAnimation?.sourceSlots.includes(index) ? 'pa-source' : ''
            }`}
            style={{ '--pa-shift': combat.programAdvanceAnimation ? String(combat.programAdvanceAnimation.targetSlot - index) : '0' } as CSSProperties}
            onClick={() => useChipSlot(index)}
          >
            <span className="chip-slot-index">{index + 1}</span>
            {chip ? (
              <>
                <span className="chip-name">{chip.name}</span>
                <span className="chip-code">Code {chip.code}</span>
              </>
            ) : (
              <span className="chip-empty-label">Empty</span>
            )}
          </button>
        ))}
          </section>
        </>
      ) : scene === 'folder' ? (
        <FolderScene />
      ) : scene === 'areaMap' ? (
        <AreaMapScene
          highlightedAreaLevel={combat.highlightedAreaLevel}
          onAreaSwitched={() => setScene('battle')}
        />
      ) : scene === 'chipTrader' ? (
        <ChipTraderScene />
      ) : (
        <HigsbyShopScene />
      )}

      <section className="scene-taskbar bottom" aria-label="Scene navigation">
        <button type="button" className={scene === 'battle' ? 'active' : ''} onClick={() => setScene('battle')}>
          Battle
        </button>
        <button type="button" className={scene === 'folder' ? 'active' : ''} onClick={() => setScene('folder')}>
          Folder
        </button>
        <button type="button" className={scene === 'areaMap' ? 'active' : ''} onClick={() => setScene('areaMap')}>
          Area Map
        </button>
        <button type="button" className={scene === 'chipTrader' ? 'active' : ''} onClick={() => setScene('chipTrader')}>
          Chip Trader
        </button>
        <button type="button" className={scene === 'higsbyShop' ? 'active' : ''} onClick={() => setScene('higsbyShop')}>
          Higsby's Shop
        </button>
      </section>
    </main>
  )
}
