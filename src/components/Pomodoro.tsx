import React, { useState, useRef, useEffect } from 'react'
import { usePomodoro } from '../providers/PomodoroProvider'
import { useTask } from '../providers/TaskProvider'
import { useUser } from '../providers/UserProvider'
import { IoPlay, IoPause, IoRefresh, IoTrash, IoCheckmarkCircle, IoSquareOutline, IoSwapHorizontal } from 'react-icons/io5'
import './styles/pomodoroStyles.css'
import CoinTracker from './CoinTracker'

type ViewMode = 'timer' | 'tasks'

export default function Pomodoro() {
  const {
    pomodoro,
    setFocusDuration,
    setBreakDuration,
    startTimer,
    pauseTimer,
    resetTimer,
    setExactSession
  } = usePomodoro()
  const { tasks, addTask, toggleTask, removeTask, clearAll } = useTask()
  const { addCoins } = useUser()
  const [viewMode, setViewMode] = useState<ViewMode>('timer')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingFocus, setEditingFocus] = useState(false)
  const [editingBreak, setEditingBreak] = useState(false)
  const [focusInput, setFocusInput] = useState(pomodoro.focusDuration.toString())
  const [breakInput, setBreakInput] = useState(pomodoro.breakDuration.toString())

  // Save exact remaining seconds for each session
  const savedTimesRef = useRef<{ focus: number; break: number }>({
    focus: pomodoro.focusDuration * 60,
    break: pomodoro.breakDuration * 60
  })

  // --- Focus time accumulation for coin rewards ---
  const [focusAccum, setFocusAccum] = useState(0)
  const prevState = useRef(pomodoro.state)
  const prevTime = useRef(pomodoro.timeRemaining)

  useEffect(() => {
    // Only count focus time, accumulate seconds
    if (pomodoro.state === 'focus' && pomodoro.isRunning) {
      const diff = prevTime.current - pomodoro.timeRemaining
      if (diff > 0) {
        setFocusAccum(acc => acc + diff)
      }
    }
    // When leaving focus, reset prevTime
    if (pomodoro.state !== prevState.current) {
      prevTime.current = pomodoro.timeRemaining
    }
    prevState.current = pomodoro.state
    prevTime.current = pomodoro.timeRemaining
  }, [pomodoro.state, pomodoro.timeRemaining, pomodoro.isRunning])

  useEffect(() => {
    // If accumulated focus time >= 20 min (1200s), award coins and reset accumulator
    if (focusAccum >= 1200) {
      addCoins(10)
      setFocusAccum(acc => acc - 1200)
    }
  }, [focusAccum, addCoins])
  // --- End focus time accumulation ---

  useEffect(() => {
    if (pomodoro.state === 'focus' || pomodoro.state === 'break') {
      savedTimesRef.current[pomodoro.state] = pomodoro.timeRemaining
    }
  }, [pomodoro.state, pomodoro.timeRemaining])

  const minutes = Math.floor(pomodoro.timeRemaining / 60)
  const seconds = pomodoro.timeRemaining % 60

  const handleFocusBlur = () => {
    const val = parseInt(focusInput)
    if (!isNaN(val) && val > 0) setFocusDuration(val)
    else setFocusInput(pomodoro.focusDuration.toString())
    setEditingFocus(false)
  }

  const handleBreakBlur = () => {
    const val = parseInt(breakInput)
    if (!isNaN(val) && val > 0) setBreakDuration(val)
    else setBreakInput(pomodoro.breakDuration.toString())
    setEditingBreak(false)
  }

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle)
      setNewTaskTitle('')
    }
  }

  // Pause, save exact seconds, switch state, restore exact seconds, remain paused
  const handleSwitchSession = () => {
    pauseTimer()
    const current = pomodoro.state
    const remaining = pomodoro.timeRemaining

    if (current === 'focus' || current === 'break') {
      savedTimesRef.current[current] = remaining
    }

    const target: 'focus' | 'break' = current === 'break' ? 'focus' : 'break'
    const defaultSeconds = target === 'focus' ? pomodoro.focusDuration * 60 : pomodoro.breakDuration * 60
    const targetSeconds = savedTimesRef.current[target] ?? defaultSeconds

    setExactSession(target, targetSeconds)
  }

  const switchTitle = pomodoro.state === 'focus' ? 'Switch to break' : 'Switch to focus'
  const formatTime = (mins: number) => `${String(mins).padStart(2, '0')}:00`

  return (
    <div className="pomodoro-container">
      <CoinTracker />
      <div className="view-toggle">
        <div className={`toggle-slider ${viewMode === 'tasks' ? 'tasks-active' : ''}`} />
        <button className={`toggle-btn ${viewMode === 'timer' ? 'active' : ''}`} onClick={() => setViewMode('timer')}>
          Timer
        </button>
        <button className={`toggle-btn ${viewMode === 'tasks' ? 'active' : ''}`} onClick={() => setViewMode('tasks')}>
          Tasks
        </button>
      </div>

      <div className={`view-content ${viewMode === 'timer' ? 'timer-view' : 'tasks-view'}`}>
        {viewMode === 'timer' ? (
          <>
            <div className="timer-section">
              <div className="timer-label">
                {pomodoro.state === 'focus' ? 'Focus Time' : pomodoro.state === 'break' ? 'Break Time' : 'Ready'}
              </div>
              <div className="timer-display">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="timer-controls">
                <button className="timer-btn timer-btn--secondary" onClick={handleSwitchSession} title={switchTitle}>
                  <IoSwapHorizontal />
                </button>

                {pomodoro.isRunning ? (
                  <button className="timer-btn timer-btn--primary" onClick={pauseTimer} title="Pause">
                    <IoPause />
                  </button>
                ) : (
                  <button className="timer-btn timer-btn--primary" onClick={startTimer} title="Start">
                    <IoPlay />
                  </button>
                )}

                <button className="timer-btn timer-btn--secondary" onClick={resetTimer} title="Reset">
                  <IoRefresh />
                </button>
              </div>

              <div className="duration-settings">
                <div className="duration-item">
                  <span className="duration-label">Focus</span>
                  <div className="duration-display">
                    {editingFocus ? (
                      <input
                        type="number"
                        className="duration-input"
                        value={focusInput}
                        onChange={(e) => setFocusInput(e.target.value)}
                        onBlur={handleFocusBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleFocusBlur()}
                        autoFocus
                      />
                    ) : (
                      <span className="duration-value" onClick={() => setEditingFocus(true)}>
                        {formatTime(pomodoro.focusDuration)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="duration-item">
                  <span className="duration-label">Break</span>
                  <div className="duration-display">
                    {editingBreak ? (
                      <input
                        type="number"
                        className="duration-input"
                        value={breakInput}
                        onChange={(e) => setBreakInput(e.target.value)}
                        onBlur={handleBreakBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleBreakBlur()}
                        autoFocus
                      />
                    ) : (
                      <span className="duration-value" onClick={() => setEditingBreak(true)}>
                        {formatTime(pomodoro.breakDuration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="compact-task-list">
              <h4>Current Tasks</h4>
              <div className="compact-tasks">
                {tasks.length === 0 ? (
                  <div className="no-tasks">No tasks yet</div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className={`compact-task-item ${task.completed ? 'completed' : ''}`}>
                      <div className="compact-task-content" onClick={() => toggleTask(task.id)}>
                        {task.completed ? (
                          <IoCheckmarkCircle className="compact-checkbox checked" />
                        ) : (
                          <IoSquareOutline className="compact-checkbox" />
                        )}
                        <span className="compact-task-title">{task.title}</span>
                      </div>
                      <button
                        type="button"
                        className="remove-task-btn"
                        aria-label="Delete task"
                        title="Delete task"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTask(task.id)
                        }}
                      >
                        <IoTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="task-management">
            <CoinTracker />
            <div className="task-input-section">
              <h4>Add New Task</h4>
              <div className="task-input-container">
                <input
                  type="text"
                  className="task-input"
                  placeholder="Enter task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <button className="add-task-btn" onClick={handleAddTask}>
                  +
                </button>
              </div>
            </div>

            <div className="task-list-section">
              <div className="task-list-header">
                <h4>All Tasks ({tasks.length})</h4>
                {tasks.length > 0 && (
                  <button className="clear-all-btn" onClick={clearAll} title="Clear all">
                    <IoTrash /> Clear All
                  </button>
                )}
              </div>
              <div className="task-list">
                {tasks.length === 0 ? (
                  <div className="no-tasks-message">No tasks. Add one above to get started!</div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                      <div className="task-content" onClick={() => toggleTask(task.id)}>
                        {task.completed ? (
                          <IoCheckmarkCircle className="task-checkbox checked" />
                        ) : (
                          <IoSquareOutline className="task-checkbox" />
                        )}
                        <span className="task-title">{task.title}</span>
                      </div>
                      <button className="remove-task-btn" onClick={() => removeTask(task.id)} title="Delete task">
                        <IoTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}