export const clearDelBuffer = async (env, userId) => {
  let query;
  let stmt;
  query = "DELETE FROM del_buffer WHERE userId = ?";
  stmt = env.TEMP_DATA.prepare(query).bind(Number(userId));

  await stmt.run();
};
