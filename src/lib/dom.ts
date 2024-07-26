class DOM {
  public id(id: string) {
    return document.getElementById(id);
  }
}

export const dom = new DOM();
