-- ETAPA 14 (achado em revisão adversarial): favorites.item_id é polimórfico
-- (aponta pra promotions OU loyalty_programs, ver 0009), então não dá pra
-- usar uma FK simples com on delete cascade. Sem isso, excluir uma promoção
-- favoritada por alguém deixa a linha em favorites órfã para sempre (some
-- de /favoritos silenciosamente, mas a tabela cresce com lixo indefinidamente).
create or replace function public.cleanup_favorites_on_item_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.favorites where item_type = TG_ARGV[0] and item_id = old.id;
  return old;
end;
$$;

create trigger promotions_cleanup_favorites
  after delete on public.promotions
  for each row execute function public.cleanup_favorites_on_item_delete('promotion');

create trigger loyalty_programs_cleanup_favorites
  after delete on public.loyalty_programs
  for each row execute function public.cleanup_favorites_on_item_delete('loyalty_program');
