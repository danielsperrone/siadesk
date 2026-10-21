import {test,expect} from '@playwright/test';
import jsQR from 'jsqr';

test('modelos prontos renderizam e QR Siamac aponta ao endereço pedido',async({page})=>{
  await page.goto('/');await page.locator('[data-model=voltage]').click();
  await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#quick-equipment')).toBeHidden();
  await page.locator('canvas').screenshot({path:'test-results/etiquetas/voltage-label.png'});
  await page.locator('[data-model=siamac]').click();await expect(page.locator('#export')).toBeEnabled();
  const bitmap=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,pixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)}));
  expect(jsQR(Uint8ClampedArray.from(bitmap.pixels),bitmap.width,bitmap.height)?.data).toBe('https://www.siamac.com.br');
  await page.locator('canvas').screenshot({path:'test-results/etiquetas/siamac-label.png'});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/etiquetas/five-models.png',fullPage:true});
});
