import { ACTION_STATUS_MESSAGE, TOGGLE_PANEL_MESSAGE } from '../lib/constant';

const ENABLED_TITLE = 'Open WindPanel theme editor';
const DISABLED_TITLE = 'No Tailwind theme variables present on this website';

export default defineBackground(() => {
  void browser.action.setTitle({ title: DISABLED_TITLE });
  void browser.action.disable();

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== ACTION_STATUS_MESSAGE || sender.tab?.id == null) return;

    void setActionAvailability(sender.tab.id, Boolean(message.hasTheme));
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      void setActionAvailability(tabId, false);
    }
  });

  browser.action.onClicked.addListener((tab) => {
    if (tab.id == null) return;

    void browser.tabs.sendMessage(tab.id, {
      type: TOGGLE_PANEL_MESSAGE,
    });
  });
});

async function setActionAvailability(tabId: number, hasTheme: boolean): Promise<void> {
  await browser.action.setTitle({
    tabId,
    title: hasTheme ? ENABLED_TITLE : DISABLED_TITLE,
  });

  if (hasTheme) {
    await browser.action.enable(tabId);
  } else {
    await browser.action.disable(tabId);
  }
}
