-- Allow storing poster renders and Dress-3D GLB outputs in campaign_media.

alter table public.campaign_media
  drop constraint if exists campaign_media_kind_check;

alter table public.campaign_media
  add constraint campaign_media_kind_check check (
    kind in (
      'source',
      'refined',
      'variant',
      'video',
      'poster',
      'model_3d'
    )
  );
