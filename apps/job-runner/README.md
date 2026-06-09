# Job Runner

Worker BullMQ pour Sonoria (transcodage audio, jobs async).

## Démarrage local (Docker)

```bash
pnpm setup:dev-env
docker compose up -d postgres redis minio minio-init
DATABASE_URL=postgresql://sonoria:sonoria@localhost:5432/sonoria \
  pnpm --filter @sonoria/user-service exec prisma db push
docker compose up -d --build gateway user-service media-service job-runner
```

## Test E2E transcode

Valide le pipeline complet : création piste → upload S3 → transcode → `READY` → stream.

```bash
pnpm e2e:transcode
```

Prérequis : stack Docker ci-dessus en cours d'exécution.

## Processors

Queue `media-processing` (toggle via `QUEUES`) :

| Job | Rôle |
|-----|------|
| `audio:transcode` | FFmpeg std/hq + waveform |
| `notification:email` | Emails (welcome, follower, comment…) |
| `stats:aggregate` | Stats artiste → Redis `artist:stats:{id}` |
| `reco:refresh` | Recommandations → Redis `reco:{userId}` |
| `cache:invalidate` | `DEL` clé Redis |

Crons : stats chaque heure, reco à 3h (locks Redis NX).

## Tests unitaires

```bash
pnpm --filter @sonoria/job-runner test
```
