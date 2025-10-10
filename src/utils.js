export const clearDelBuffer = (userId) => {
  DEL_BUFFER[userId]["id"] = null;
  DEL_BUFFER[userId]["currStub"] = null;
};
