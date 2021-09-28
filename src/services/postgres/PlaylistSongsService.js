const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBToPlaylistSongs } = require('../../utils');

class PlaylistSongsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addPlaylistSong({ songId, playlistId }) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }

    await this._cacheService.delete(`playlist:${playlistId}`);
    return result.rows[0].id;
  }

  async deletePlaylistSongById(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal dihapus dari playlist, Id tidak ditemukan');
    }

    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async getPlaylistSongs(playlistId) {
    try {
      // mendapatkan catatan dari cache
      const result = await this._cacheService.get(`playlist:${playlistId}`);
      return JSON.parse(result);
    } catch (error) {
      const query = {
        text: 'SELECT p.id, s.title, s.performer FROM playlistsongs p LEFT JOIN songs s ON p.song_id = s.id WHERE p.playlist_id = $1 ',
        values: [playlistId],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new InvariantError('Playlist gagal diverifikasi');
      }

      const mappedResult = result.rows;
      await this._cacheService.set(`playlist:${playlistId}`, JSON.stringify(mappedResult));

      return mappedResult;
    }

    // console.log(result);
    // return result.rows;
    // return result.rows.map(mapDBToPlaylistSongs);
  }

  async verifyPlaylistSongsOwner(playlistId, credentialId) {
    const query = {
      // text: 'SELECT p.id, p.playlist_id, p.song_id, y.owner  FROM playlistsongs p LEFT JOIN playlists y ON  p.playlist_id = y.id WHERE p.id = $1',
      text: 'SELECT owner FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    const playlistsong = result.rows[0];
    if (playlistsong.owner !== credentialId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyExportPlaylistsOwner(credentialId) {
    const query = {
      // text: 'SELECT p.id, p.playlist_id, p.song_id, y.owner  FROM playlistsongs p LEFT JOIN playlists y ON  p.playlist_id = y.id WHERE p.id = $1',
      text: 'SELECT owner FROM playlists WHERE owner = $1',
      values: [credentialId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Owner tidak ditemukan');
    }
    const playlistsong = result.rows[0];
    if (playlistsong.owner !== credentialId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }
}
module.exports = PlaylistSongsService;
