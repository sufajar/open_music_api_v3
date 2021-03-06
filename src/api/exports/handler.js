const ClientError = require('../../exceptions/ClientError');

class ExportsHandler {
  constructor(service, servicePlaylist, validator) {
    this._service = service;
    this._validator = validator;
    this._servicePlaylist = servicePlaylist;

    this.postExportPlaylistSongsHandler = this.postExportPlaylistSongsHandler.bind(this);
  }

  async postExportPlaylistSongsHandler(request, h) {
    try {
      this._validator.validateExportPlaylistSongsPayload(request.payload);
      const { playlistId } = request.params;
      const { id: credentialId } = request.auth.credentials;
      await this._servicePlaylist.verifyPlaylistOwner(playlistId, credentialId);
      /*  const { id: credentialId } = request.auth.credentials;
      const { playlistId } = request.params;
      await this._service.verifyPlaylistSongsOwner(playlistId, credentialId);
      */

      const message = {
        userId: request.auth.credentials.id,
        targetEmail: request.payload.targetEmail,
      };

      await this._service.sendMessage('export:playlists', JSON.stringify(message));

      const response = h.response({
        status: 'success',
        message: 'Permintaan Anda sedang kami proses',
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = ExportsHandler;
