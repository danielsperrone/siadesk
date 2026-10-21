import {test,expect} from '@playwright/test';

test('início mostra seis modelos e editor extra preserva dados',async({page})=>{
  await page.goto('/');await expect(page.locator('.model-picker button')).toHaveCount(6);
  await expect(page.locator('.editor')).toBeHidden();await expect(page.locator('#print')).toBeDisabled();
  await page.locator('#wire-name').fill('Sensor emissor - Lado A');await page.locator('#wire-detail').fill('Fio 24v');
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#advanced-view').click();await expect(page.locator('.editor')).toBeVisible();
  await page.locator('#title').fill('Modelo livre preservado');
  await page.locator('#home-view').click();await expect(page.locator('#wire-name')).toHaveValue('Sensor emissor - Lado A');
  await page.locator('#advanced-view').click();await expect(page.locator('#title')).toHaveValue('Modelo livre preservado');
});

test('equipamento requer dados e não persiste senha; X ocupa a etiqueta',async({page})=>{
  await page.goto('/');await page.locator('[data-model=equipment]').click();
  await expect(page.locator('#export')).toBeDisabled();
  for(const [id,value] of [['equipment-name','Controlador da balança'],['equipment-ip','192.168.0.100'],['equipment-user','operador'],['equipment-password','Exemplo-teste-42']])await page.locator('#'+id).fill(value);
  await expect(page.locator('#render-error')).toBeHidden();await expect(page.locator('#export')).toBeEnabled();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Exemplo-teste-42');
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/etiquetas/home-equipment.png',fullPage:true});
  await page.locator('canvas').screenshot({path:'test-results/etiquetas/equipment-label.png'});
  await page.locator('[data-model=cross]').click();await expect(page.locator('#quick-equipment')).toBeHidden();await expect(page.locator('#export')).toBeEnabled();
  const bounds=await page.locator('canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let min=c.height,max=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4]===0){min=Math.min(min,y);max=Math.max(max,y);}return{height:max-min,center:(min+max)/2,h:c.height};});
  expect(bounds.height).toBeGreaterThan(200);expect(Math.abs(bounds.center-bounds.h/2)).toBeLessThan(2);
  await page.locator('canvas').screenshot({path:'test-results/etiquetas/x-label.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/etiquetas/home-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await page.locator('[data-model=equipment]').click();await expect(page.locator('#equipment-password')).toHaveValue('');
});
