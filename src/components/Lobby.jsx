/**
 * Lobby.jsx
 * Create-room / join-room screen.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useGame, ACTIONS } from '../game/GameContext.jsx';
import { PeerManager } from '../network/PeerManager.js';
import { PLAYER_COLORS, PLAYER_NAMES } from '../game/boardLayout.js';
import { PHASES } from '../game/GameState.js';

export default function Lobby({ onStart }) {
  const { state, dispatch } = useGame();
  const [mode, setMode] = useState(null); // 'host' | 'join'
  const [inputRoom, setInputRoom] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const peerRef = useRef(null);
  const stateRef = useRef(state);

  // Keep state ref fresh for PeerManager broadcaster
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Host ────────────────────────────────────────────────────────────────────
  async function handleCreateRoom() {
    setConnecting(true);
    setError('');
    try {
      const pm = new PeerManager({
        onStateSync: null, // host doesn't receive syncs
        onPlayerJoined: (playerIndex, peerId) => {
          dispatch({ type: ACTIONS.JOIN_PLAYER, payload: { playerIndex, peerId } });
        },
        dispatch,
      });
      pm.setStateGetter(() => stateRef.current);
      peerRef.current = pm;
      const roomId = await pm.createRoom();
      dispatch({ type: ACTIONS.SET_ROOM, payload: roomId });
      dispatch({ type: ACTIONS.SET_MY_INDEX, payload: 0 });
      // Register host as player 0
      dispatch({
        type: ACTIONS.JOIN_PLAYER,
        payload: { playerIndex: 0, peerId: roomId, name: 'Host' },
      });
    } catch (e) {
      setError('Could not create room. Check your connection.');
      console.error(e);
    }
    setConnecting(false);
  }

  // ── Client ──────────────────────────────────────────────────────────────────
  async function handleJoinRoom() {
    if (!inputRoom.trim()) return;
    setConnecting(true);
    setError('');
    try {
      const pm = new PeerManager({
        onStateSync: syncedState => dispatch({ type: ACTIONS.SYNC_STATE, payload: syncedState }),
        onPlayerJoined: null,
        dispatch,
      });
      peerRef.current = pm;
      await pm.joinRoom(inputRoom.toUpperCase().trim());
    } catch (e) {
      setError('Could not connect. Check the Room ID.');
      console.error(e);
    }
    setConnecting(false);
  }

  // ── Start game (host only) ──────────────────────────────────────────────────
  function handleStart() {
    dispatch({ type: ACTIONS.START_GAME });
    // Broadcast state to clients
    if (peerRef.current?.isHost) {
      setTimeout(() => peerRef.current.broadcastState(stateRef.current), 50);
    }
    if (onStart) onStart(peerRef.current);
  }

  function copyRoomId() {
    navigator.clipboard.writeText(state.roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isHost = state.myPlayerIndex === 0;
  const canStart = isHost && state.activePlayerCount >= 2 && state.activePlayerCount <= 8;
  const joined = state.players.filter(p => p.isActive);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!mode && !state.roomId) {
    return (
      <div className="lobby">
        <div className="lobby-logo">🎲 Ludo King 8P</div>
        <div className="lobby-subtitle">8-Player WebRTC Multiplayer</div>
        <button className="btn btn-primary" onClick={() => { setMode('host'); handleCreateRoom(); }}>
          🏠 Create Room
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('join')}>
          🔗 Join Room
        </button>
        {error && <div className="lobby-error">{error}</div>}
      </div>
    );
  }

  if (mode === 'join' && !state.roomId) {
    return (
      <div className="lobby">
        <div className="lobby-logo">🎲 Ludo King 8P</div>
        <div className="lobby-input-group">
          <input
            className="lobby-input"
            placeholder="Enter Room ID"
            value={inputRoom}
            onChange={e => setInputRoom(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button className="btn btn-primary" onClick={handleJoinRoom} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Join'}
          </button>
        </div>
        <button className="btn btn-ghost" onClick={() => setMode(null)}>← Back</button>
        {error && <div className="lobby-error">{error}</div>}
      </div>
    );
  }

  // Room created / joined – show waiting room
  return (
    <div className="lobby">
      <div className="lobby-logo">🎲 Ludo King 8P</div>
      {state.roomId && (
        <div className="lobby-room-id" onClick={copyRoomId} title="Tap to copy">
          Room ID: <span className="room-id-code">{state.roomId}</span>
          <span className="copy-hint">{copied ? ' ✅ Copied!' : ' 📋'}</span>
        </div>
      )}

      <div className="lobby-players">
        {Array.from({ length: 8 }, (_, i) => {
          const player = state.players[i];
          const active = player.isActive;
          return (
            <div key={i} className={`lobby-player-slot ${active ? 'active' : 'empty'}`}>
              <div className="slot-color" style={{ background: PLAYER_COLORS[i] }} />
              <div className="slot-info">
                <span className="slot-name">{active ? player.name : `Player ${i + 1}`}</span>
                <span className="slot-status">{active ? '● Ready' : '○ Waiting…'}</span>
              </div>
              {i === state.myPlayerIndex && <span className="you-tag">YOU</span>}
            </div>
          );
        })}
      </div>

      <div className="lobby-count">{state.activePlayerCount} / 8 players</div>

      {isHost ? (
        <button className="btn btn-primary" onClick={handleStart} disabled={!canStart}>
          {canStart ? '▶ Start Game' : 'Waiting for players…'}
        </button>
      ) : (
        <div className="lobby-waiting">Waiting for host to start…</div>
      )}

      {connecting && <div className="lobby-connecting">Connecting…</div>}
      {error && <div className="lobby-error">{error}</div>}
    </div>
  );
}
