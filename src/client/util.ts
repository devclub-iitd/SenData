// Taken from https://stackoverflow.com/a/18650828/5585431
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatTime(time: number): string {
  time /= 1000;
  const sec = Math.round(time % 60);
  time /= 60;
  const min = Math.round(time % 60);
  time /= 60;
  const hour = Math.round(time);

  let text = "";
  if (hour !== 0) { text += `${hour} h `; }
  if (min !== 0) { text += `${min} m `; }
  if (sec !== 0) { text += `${sec} s `; }
  return text;
}

/*
* Shows the ith child of targetNode by adding class show to that element
* and removing it from others.
*/
export function showChild(targetNode: HTMLElement | null, i: number): void {
  if (targetNode) {
    targetNode.querySelectorAll(".show").forEach((elem: Element): void => {
      elem.classList.remove("show");
    });
    const childShow = targetNode.children[i] as HTMLElement | null;
    if (childShow) {
      // If data-centered is present in child, add class centered to parent
      // Allows for a centered layout by an attribute of child
      if (childShow.dataset.centered !== undefined) {
        targetNode.classList.add("centered");
      }
      else {
        targetNode.classList.remove("centered");
      }
      childShow.classList.add("show");

      // If the child has data-heading attribute, assuming that the previous
      // sibling of targetNode is a header in which there is a span where we
      // have to place the heading
      if (childShow.dataset.heading) {
        const header = targetNode.previousElementSibling as HTMLElement;
        const span = header.querySelector("span") as HTMLElement;
        span.textContent = childShow.dataset.heading;
      }
    }
  }
}

export const showMainPage = (pageName: 
'loginPage' |
'usersPage' |
'connectedPage'
): void => {
  const showContainer = document.querySelector("body .show-container") as HTMLElement;
  switch (pageName) {
    case 'loginPage':
      showChild(showContainer, 0);
      return;
    case 'usersPage':
      showChild(showContainer, 1);
      return;
    case 'connectedPage':
      showChild(showContainer, 2);
  }
};
  
export const showConnectedSubPage = (pageName:
'select-files-send' |
'approve-files' |
'wait-approval' |
'processing-files' | 
'file-progress'
): void => {
  const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
  switch(pageName) {
    case 'select-files-send':
      showChild(showContainer, 0);
      return;
    case 'approve-files':
      showChild(showContainer, 1);
      return;
    case 'wait-approval':
      showChild(showContainer, 2);
      return;
    case 'processing-files':
      showChild(showContainer, 3);
      return;
    case 'file-progress':
      showChild(showContainer, 4);
      return;
  }
};
