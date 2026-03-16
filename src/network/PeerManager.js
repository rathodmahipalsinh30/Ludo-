/**
 * PeerManager.js
 * Thin wrapper around PeerJS for host/join/broadcast logic.
 *
 * Host (Player 0):
 *   - Creates a Peer with a short alphanumeric roomId.
 *   - Listens for incoming connections from other players.
 *   - Receives actions from peers, applies them to authoritative state,
 *     then broadcasts the new state to everyone.
 *
 * Client (Players 1-7):
 *   - Creates an anonymous Peer.
 *   - Connects to the host by roomId.
 *   - Sends action messages to the host and waits for state broadcasts.
 */
import Peer from 'peerjs';
import { ACTIONS } from '../game/GameContext.jsx';

/** Generate a 6-character alphanumeric room ID */
function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  const buf = new Uint8Array(6);
  window.crypto.getRandomValues(buf);
  buf.forEach(b => { id += chars[b % chars.length]; });
  return id;
}

export class PeerManager {
  constructor({ onStateSync, onPlayerJoined, dispatch }) {
    this.peer = null;
    this.connections = []; // host keeps all client connections
    this.hostConn = null;  // clients keep the single host connection
    this.isHost = false;
    this.roomId = null;
    this.onStateSync = onStateSync;   // (state) => void
    this.onPlayerJoined = onPlayerJoined; // (playerIndex, peerId) => void
    this.dispatch = dispatch;
    this._getState = null; // set by host after init
  }

  /** Called by the host to register a state getter (so we can broadcast) */
  setStateGetter(fn) {
    this._getState = fn;
  }

  // ─── Host flow ─────────────────────────────────────────────────────────────
  createRoom() {
    return new Promise((resolve, reject) => {
      const roomId = genRoomId();
      this.roomId = roomId;
      this.isHost = true;
      this.peer = new Peer(roomId, { debug: 0 });

      this.peer.on('open', id => {
        console.log('[PeerManager] Host peer opened, roomId=', id);
        resolve(id);
      });

      this.peer.on('connection', conn => {
        console.log('[PeerManager] Incoming connection from', conn.peer);
        conn.on('open', () => {
          this.connections.push(conn);
          // Tell the new peer which player slot they are
          const playerIndex = this.connections.length; // 1-7
          conn.send({ type: 'ASSIGN_SLOT', playerIndex, roomId });
          if (this.onPlayerJoined) this.onPlayerJoined(playerIndex, conn.peer);
        });

        conn.on('data', data => this._handleHostReceive(data, conn));
        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
        });
        conn.on('error', err => console.error('[PeerManager] conn error', err));
      });

      this.peer.on('error', err => {
        console.error('[PeerManager] peer error', err);
        reject(err);
      });
    });
  }

  /** Host receives an action from a client, applies it, broadcasts state */
  _handleHostReceive(data, _senderConn) {
    if (!data || !data.type) return;
    if (data.type === 'ACTION') {
      // Dispatch locally (triggers reducer on host)
      this.dispatch(data.action);
      // After state update we broadcast – use a microtask to let React flush
      setTimeout(() => {
        if (this._getState) {
          this.broadcastState(this._getState());
        }
      }, 0);
    }
  }

  /** Broadcast full state JSON to all connected peers */
  broadcastState(state) {
    const msg = { type: 'STATE_SYNC', state };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  // ─── Client flow ───────────────────────────────────────────────────────────
  joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.roomId = roomId;
      this.isHost = false;
      this.peer = new Peer(undefined, { debug: 0 });

      this.peer.on('open', myId => {
        console.log('[PeerManager] Client peer opened', myId);
        const conn = this.peer.connect(roomId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          console.log('[PeerManager] Connected to host');
          resolve(conn);
        });

        conn.on('data', data => this._handleClientReceive(data));
        conn.on('error', err => {
          console.error('[PeerManager] host conn error', err);
          reject(err);
        });
      });

      this.peer.on('error', err => {
        console.error('[PeerManager] peer error', err);
        reject(err);
      });
    });
  }

  /** Client receives data from host */
  _handleClientReceive(data) {
    if (!data || !data.type) return;
    if (data.type === 'ASSIGN_SLOT') {
      this.dispatch({ type: ACTIONS.SET_MY_INDEX, payload: data.playerIndex });
      this.dispatch({
        type: ACTIONS.JOIN_PLAYER,
        payload: { playerIndex: data.playerIndex, peerId: this.peer.id },
      });
    }
    if (data.type === 'STATE_SYNC') {
      if (this.onStateSync) this.onStateSync(data.state);
    }
  }

  /**
   * Send an action to the host (clients call this; host calls dispatch directly).
   */
  sendAction(action) {
    if (this.isHost) {
      this.dispatch(action);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({ type: 'ACTION', action });
    }
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.hostConn = null;
  }
}

export default PeerManager;
