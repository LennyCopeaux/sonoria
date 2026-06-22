import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';

const mockPrisma = {
  playlist: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
};
const mockSlug = { uniquePlaylistSlug: jest.fn() };

function buildService(): PlaylistsService {
  return new PlaylistsService(mockPrisma as never, mockSlug as never);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PlaylistsService.create', () => {
  it('generates a unique slug and creates the playlist', async () => {
    mockSlug.uniquePlaylistSlug.mockResolvedValue('my-playlist');
    mockPrisma.playlist.create.mockResolvedValue({
      id: 'p1',
      slug: 'my-playlist',
    });

    const result = await buildService().create('u1', { title: 'My Playlist' });

    expect(mockSlug.uniquePlaylistSlug).toHaveBeenCalledWith('My Playlist');
    expect(mockPrisma.playlist.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'p1', slug: 'my-playlist' });
  });
});

describe('PlaylistsService.remove', () => {
  it('throws when the playlist does not exist', async () => {
    mockPrisma.playlist.findUnique.mockResolvedValue(null);

    await expect(buildService().remove('p1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the caller is not the owner', async () => {
    mockPrisma.playlist.findUnique.mockResolvedValue({
      id: 'p1',
      ownerId: 'someone-else',
    });

    await expect(buildService().remove('p1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
